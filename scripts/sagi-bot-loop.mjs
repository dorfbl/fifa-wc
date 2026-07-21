// Sagi Cohen bot — bets using a blend of bookmaker odds + actual tournament performance
// Runs every 10 minutes. Places bets up to 24h before kickoff.
import Anthropic from '@anthropic-ai/sdk';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:!Meggie4life@localhost:5432/mondial_2026' });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const API_KEY = 'fc51506d8c256d3241ca4f2caa6beea8';
const BASE = 'https://v3.football.api-sports.io';

async function apiFetch(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { 'x-apisports-key': API_KEY } });
  return res.json();
}

// ── Poisson sampler ──────────────────────────────────────────────────────────

function poissonSample(lambda) {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return Math.min(k - 1, 8);
}

// ── Tournament stats for a single team (recent matches weighted more) ────────

async function getTeamStats(teamId) {
  const res = await pool.query(`
    SELECT
      CASE WHEN home_team_id=$1 THEN home_score ELSE away_score END AS scored,
      CASE WHEN home_team_id=$1 THEN away_score ELSE home_score END AS conceded
    FROM matches
    WHERE (home_team_id=$1 OR away_team_id=$1)
      AND status = 'finished'
      AND home_score IS NOT NULL
    ORDER BY match_date DESC
    LIMIT 6
  `, [teamId]);

  if (res.rows.length === 0) return null;

  // Exponential recency weighting: most recent match gets highest weight
  let totalScored = 0, totalConceded = 0, totalWeight = 0;
  res.rows.forEach((row, i) => {
    const weight = Math.pow(0.75, i); // 1, 0.75, 0.56, 0.42 …
    totalScored   += row.scored   * weight;
    totalConceded += row.conceded * weight;
    totalWeight   += weight;
  });

  return {
    games: res.rows.length,
    avgScored:    totalScored   / totalWeight,
    avgConceded:  totalConceded / totalWeight,
  };
}

// ── Tournament-wide average goals per team per game (for normalization) ──────

async function getTournamentAvgGoals() {
  const res = await pool.query(`
    SELECT AVG((home_score + away_score) / 2.0) AS avg_per_team
    FROM matches
    WHERE status = 'finished' AND home_score IS NOT NULL
  `);
  const avg = parseFloat(res.rows[0]?.avg_per_team);
  return isNaN(avg) || avg <= 0 ? 1.35 : avg; // WC historical fallback
}

// ── Score generation: blend odds + Dixon-Coles team strength model ───────────

function generateScore(homeOdds, drawOdds, awayOdds, homeStats, awayStats, leagueAvg) {
  // Normalize bookmaker odds → implied probabilities (remove vig)
  const rh = 1 / homeOdds, rd = 1 / drawOdds, ra = 1 / awayOdds;
  const total = rh + rd + ra;
  const pH = rh / total, pA = ra / total;

  // Odds-based Poisson lambdas
  const lambdaH_odds = 0.6 + pH * 3.1;
  const lambdaA_odds = 0.6 + pA * 3.1;

  let lambdaHome, lambdaAway;

  if (homeStats && awayStats && leagueAvg > 0) {
    // Dixon-Coles attack/defense strengths relative to league average
    const homeAttack  = homeStats.avgScored    / leagueAvg;
    const homeDef     = homeStats.avgConceded  / leagueAvg;
    const awayAttack  = awayStats.avgScored    / leagueAvg;
    const awayDef     = awayStats.avgConceded  / leagueAvg;

    // Expected goals: attacker's strength × opponent's defensive weakness × league baseline
    const lambdaH_perf = Math.max(0.2, homeAttack * awayDef   * leagueAvg);
    const lambdaA_perf = Math.max(0.2, awayAttack * homeDef   * leagueAvg);

    // 40% odds (market wisdom) + 60% tournament performance
    const alpha = homeStats.games >= 3 && awayStats.games >= 3 ? 0.35 : 0.5;
    lambdaHome = alpha * lambdaH_odds + (1 - alpha) * lambdaH_perf;
    lambdaAway = alpha * lambdaA_odds + (1 - alpha) * lambdaA_perf;
  } else {
    // No tournament data yet — fall back to pure odds model
    lambdaHome = lambdaH_odds;
    lambdaAway = lambdaA_odds;
  }

  // Clamp to reasonable range
  lambdaHome = Math.max(0.3, Math.min(4.5, lambdaHome));
  lambdaAway = Math.max(0.3, Math.min(4.5, lambdaAway));

  return [poissonSample(lambdaHome), poissonSample(lambdaAway), lambdaHome.toFixed(2), lambdaAway.toFixed(2)];
}

// ── Ensure Sagi user exists ──────────────────────────────────────────────────

async function getSagiId() {
  const res = await pool.query(`SELECT id FROM users WHERE is_bot = true LIMIT 1`);
  if (res.rows[0]) return res.rows[0].id;

  const created = await pool.query(`
    INSERT INTO users (username, display_name, pin_hash, is_bot, is_first_login)
    VALUES ('sagi_cohen', 'שגיא כהן', 'bot_no_login', true, false)
    RETURNING id
  `);
  console.log('Created Sagi Cohen bot user id:', created.rows[0].id);
  return created.rows[0].id;
}

// ── Champion pick — best team by group-stage points ──────────────────────────

async function pickChampion(sagiId) {
  const existing = await pool.query('SELECT 1 FROM tournament_winners WHERE user_id=$1', [sagiId]);
  if (existing.rows.length > 0) return;

  try {
    const res = await pool.query(`
      SELECT t.id, t.name_he,
        SUM(CASE
          WHEN m.status='finished' AND m.home_team_id=t.id AND m.home_score > m.away_score THEN 3
          WHEN m.status='finished' AND m.away_team_id=t.id AND m.away_score > m.home_score THEN 3
          WHEN m.status='finished' AND m.home_score = m.away_score                        THEN 1
          ELSE 0
        END) AS pts,
        COUNT(CASE WHEN m.status='finished' THEN 1 END) AS played
      FROM teams t
      LEFT JOIN matches m ON (m.home_team_id=t.id OR m.away_team_id=t.id) AND m.stage='group'
      GROUP BY t.id, t.name_he
      HAVING COUNT(CASE WHEN m.status='finished' THEN 1 END) > 0
      ORDER BY pts DESC, t.id
      LIMIT 1
    `);

    let teamId, label;
    if (res.rows.length > 0) {
      teamId = res.rows[0].id;
      label = `${res.rows[0].name_he} (${res.rows[0].pts} pts in group stage)`;
    } else {
      const fallback = await pool.query('SELECT id, name_he FROM teams ORDER BY RANDOM() LIMIT 1');
      if (!fallback.rows[0]) { console.log('Sagi champion: no teams in DB'); return; }
      teamId = fallback.rows[0].id;
      label = `${fallback.rows[0].name_he} (random — no matches played yet)`;
    }

    await pool.query(
      `INSERT INTO tournament_winners (user_id, team_id, points) VALUES ($1,$2,0) ON CONFLICT (user_id) DO NOTHING`,
      [sagiId, teamId]
    );
    console.log(`Sagi champion pick: ${label}`);
  } catch (e) {
    console.error('Sagi champion error:', e.message);
  }
}

// ── Top scorer pick — player with most goals so far ──────────────────────────

async function pickTopScorer(sagiId) {
  const existing = await pool.query('SELECT 1 FROM top_scorer_picks WHERE user_id=$1', [sagiId]);
  if (existing.rows.length > 0) return;

  try {
    const res = await pool.query(`
      SELECT me.player_name, COUNT(*) AS goals
      FROM match_events me
      JOIN matches m ON m.id = me.match_id
      WHERE me.event_type = 'goal'
        AND me.detail NOT ILIKE '%own%'
        AND m.status = 'finished'
      GROUP BY me.player_name
      ORDER BY goals DESC
      LIMIT 5
    `);

    let playerId, label;
    for (const row of res.rows) {
      const lastName = row.player_name.split(' ').pop();
      const pr = await pool.query(`SELECT id FROM players WHERE name ILIKE $1 LIMIT 1`, [`%${lastName}%`]);
      if (pr.rows[0]) {
        playerId = pr.rows[0].id;
        label = `${row.player_name} (${row.goals} goals so far)`;
        break;
      }
    }

    if (!playerId) {
      try {
        const playersRes = await pool.query('SELECT name FROM players ORDER BY name');
        const playerNames = playersRes.rows.map(r => r.name).join(', ');
        const msg = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: `You are picking the top scorer for the 2026 FIFA World Cup.
Focus on the biggest stars and most prolific tournament scorers: players like Messi, Ronaldo, Yamal, Haaland, Martinez, Neymar, Salah, Vinicius — whoever appears in this list.
Tournament database players: ${playerNames}
Reply with ONLY a comma-separated list of up to 8 player names from that list, ranked most likely top scorer to least likely. No explanation, no other text.`,
          }],
        });
        const suggestions = msg.content[0].text.split(',').map(s => s.trim());
        for (const name of suggestions) {
          const lastName = name.split(' ').pop();
          const pr = await pool.query(`SELECT id FROM players WHERE name ILIKE $1 LIMIT 1`, [`%${lastName}%`]);
          if (pr.rows[0]) {
            playerId = pr.rows[0].id;
            label = `${name} (AI pick — no tournament data yet)`;
            break;
          }
        }
      } catch (e) {
        console.error('Sagi AI top scorer error:', e.message);
      }
    }

    if (!playerId) {
      const fallback = await pool.query('SELECT id, name FROM players ORDER BY RANDOM() LIMIT 1');
      if (!fallback.rows[0]) { console.log('Sagi top scorer: no players in DB'); return; }
      playerId = fallback.rows[0].id;
      label = `${fallback.rows[0].name} (random fallback)`;
    }

    await pool.query(
      `INSERT INTO top_scorer_picks (user_id, player_id, points) VALUES ($1,$2,0) ON CONFLICT (user_id) DO NOTHING`,
      [sagiId, playerId]
    );
    console.log(`Sagi top scorer pick: ${label}`);
  } catch (e) {
    console.error('Sagi top scorer error:', e.message);
  }
}

// ── Fetch Match Winner odds ───────────────────────────────────────────────────

async function fetchMatchOdds(fixtureId) {
  let homeOdds = 2.5, drawOdds = 3.2, awayOdds = 2.5;
  try {
    const data = await apiFetch(`/odds?fixture=${fixtureId}`);
    for (const bookmaker of data?.response?.[0]?.bookmakers || []) {
      const market = bookmaker.bets?.find(b => b.name === 'Match Winner');
      if (!market) continue;
      const h = parseFloat(market.values?.find(v => v.value === 'Home')?.odd);
      const d = parseFloat(market.values?.find(v => v.value === 'Draw')?.odd);
      const a = parseFloat(market.values?.find(v => v.value === 'Away')?.odd);
      if (!isNaN(h) && !isNaN(d) && !isNaN(a)) {
        homeOdds = h; drawOdds = d; awayOdds = a;
        break;
      }
    }
  } catch { /* use fallback */ }
  return { homeOdds, drawOdds, awayOdds };
}

// ── Place initial bets (up to 24h before kickoff) ────────────────────────────

async function placeBets(sagiId) {
  const matches = await pool.query(`
    SELECT m.id, m.apisports_id, m.home_team_id, m.away_team_id
    FROM matches m
    WHERE m.status = 'scheduled'
      AND m.match_date BETWEEN NOW() + INTERVAL '5 minutes' AND NOW() + INTERVAL '24 hours'
      AND m.id NOT IN (SELECT match_id FROM predictions WHERE user_id = $1)
  `, [sagiId]);

  if (matches.rows.length === 0) return;

  const leagueAvg = await getTournamentAvgGoals();

  for (const match of matches.rows) {
    if (!match.apisports_id) continue;
    try {
      const { homeOdds, drawOdds, awayOdds } = await fetchMatchOdds(match.apisports_id);
      const homeStats = await getTeamStats(match.home_team_id);
      const awayStats = await getTeamStats(match.away_team_id);

      const [h, a, lH, lA] = generateScore(homeOdds, drawOdds, awayOdds, homeStats, awayStats, leagueAvg);

      await pool.query(
        `INSERT INTO predictions (user_id, match_id, home_score, away_score, is_double, points)
         VALUES ($1, $2, $3, $4, false, NULL)
         ON CONFLICT (user_id, match_id) DO NOTHING`,
        [sagiId, match.id, h, a]
      );

      const statsLog = homeStats && awayStats
        ? ` | home λ=${lH} (atk=${homeStats.avgScored.toFixed(2)},def=${homeStats.avgConceded.toFixed(2)}) away λ=${lA} (atk=${awayStats.avgScored.toFixed(2)},def=${awayStats.avgConceded.toFixed(2)}) leagueAvg=${leagueAvg.toFixed(2)}`
        : ' | no tournament stats, odds-only';
      console.log(new Date().toISOString(), `Sagi bet match ${match.id}: ${h}-${a} (odds ${homeOdds}/${drawOdds}/${awayOdds})${statsLog}`);
    } catch (e) {
      console.error('Sagi bet error match', match.id, e.message);
    }
  }
}

// ── Review bets 30 min before kickoff ────────────────────────────────────────

async function reviewBets(sagiId) {
  const matches = await pool.query(`
    SELECT m.id, m.apisports_id, m.home_team_id, m.away_team_id,
           p.home_score as old_home, p.away_score as old_away
    FROM matches m
    JOIN predictions p ON p.match_id = m.id AND p.user_id = $1
    WHERE m.status = 'scheduled'
      AND m.match_date BETWEEN NOW() + INTERVAL '25 minutes' AND NOW() + INTERVAL '40 minutes'
  `, [sagiId]);

  if (matches.rows.length === 0) return;

  const leagueAvg = await getTournamentAvgGoals();

  for (const match of matches.rows) {
    if (!match.apisports_id) continue;
    try {
      const { homeOdds, drawOdds, awayOdds } = await fetchMatchOdds(match.apisports_id);
      const homeStats = await getTeamStats(match.home_team_id);
      const awayStats = await getTeamStats(match.away_team_id);

      const [newH, newA] = generateScore(homeOdds, drawOdds, awayOdds, homeStats, awayStats, leagueAvg);
      const scoreChanged = newH !== match.old_home || newA !== match.old_away;

      if (!scoreChanged) {
        console.log(new Date().toISOString(), `Sagi review match ${match.id}: model stable, keeping ${match.old_home}-${match.old_away}`);
        continue;
      }

      // 65% chance Sagi acts on the updated model output
      if (Math.random() > 0.65) {
        console.log(new Date().toISOString(), `Sagi review match ${match.id}: model shifted but keeping ${match.old_home}-${match.old_away}`);
        continue;
      }

      await pool.query(
        `UPDATE predictions SET home_score=$1, away_score=$2 WHERE user_id=$3 AND match_id=$4`,
        [newH, newA, sagiId, match.id]
      );
      console.log(new Date().toISOString(), `Sagi UPDATED bet match ${match.id}: ${match.old_home}-${match.old_away} → ${newH}-${newA}`);
    } catch (e) {
      console.error('Sagi review error match', match.id, e.message);
    }
  }
}

// ── Main loop ────────────────────────────────────────────────────────────────

async function run() {
  try {
    const sagiId = await getSagiId();
    await pickChampion(sagiId);
    await pickTopScorer(sagiId);
    await placeBets(sagiId);
    await reviewBets(sagiId);
  } catch (e) {
    console.error(new Date().toISOString(), 'Sagi bot error:', e.message);
  }
}

run();
setInterval(run, 10 * 60 * 1000); // every 10 minutes
