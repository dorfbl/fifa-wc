// Sagi Cohen bot — bets on upcoming matches using odds-based Poisson algorithm
// Runs every 10 minutes. Places bets up to 24h before kickoff.
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:!Meggie4life@localhost:5432/mondial_2026' });
const API_KEY = 'fc51506d8c256d3241ca4f2caa6beea8';
const BASE = 'https://v3.football.api-sports.io';

async function apiFetch(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { 'x-apisports-key': API_KEY } });
  return res.json();
}

// ── Poisson score generation (same as dice button) ──────────────────────────

function poissonSample(lambda) {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return Math.min(k - 1, 8);
}

function generateScore(homeOdds, drawOdds, awayOdds) {
  const rh = 1 / homeOdds, rd = 1 / drawOdds, ra = 1 / awayOdds;
  const total = rh + rd + ra;
  let home = rh / total, draw = rd / total, away = ra / total;

  // Sharpen probabilities so heavy favorites almost always win
  const alpha = 2.5;
  const sh = Math.pow(home, alpha), sd = Math.pow(draw, alpha), sa = Math.pow(away, alpha);
  const st = sh + sd + sa;
  const sharpHome = sh / st, sharpDraw = sd / st;

  const rand = Math.random();
  let outcome;
  if (rand < sharpHome) outcome = 'home';
  else if (rand < sharpHome + sharpDraw) outcome = 'draw';
  else outcome = 'away';

  let h, a;
  if (outcome === 'draw') {
    const goals = poissonSample(1.1);
    h = a = goals;
  } else {
    const winnerProb = outcome === 'home' ? home : away;
    const loserProb  = outcome === 'home' ? away  : home;
    const strength = winnerProb / (winnerProb + loserProb);

    const lambdaW = 1.3 + (strength - 0.5) * 3.8;
    const lambdaL = 1.3 - (strength - 0.5) * 2.0;

    let w = 0, l = 0, tries = 0;
    do {
      w = poissonSample(lambdaW);
      l = poissonSample(lambdaL);
      tries++;
    } while (w <= l && tries < 20);
    if (w <= l) w = l + 1;

    h = outcome === 'home' ? w : l;
    a = outcome === 'home' ? l : w;
  }
  return [h, a];
}

// ── Ensure Sagi user exists ──────────────────────────────────────────────────

async function getSagiId() {
  const res = await pool.query(`SELECT id FROM users WHERE is_bot = true LIMIT 1`);
  if (res.rows[0]) return res.rows[0].id;

  // Create Sagi
  const created = await pool.query(`
    INSERT INTO users (username, display_name, pin_hash, is_bot, is_first_login)
    VALUES ('sagi_cohen', 'שגיא כהן', 'bot_no_login', true, false)
    RETURNING id
  `);
  console.log('Created Sagi Cohen bot user id:', created.rows[0].id);
  return created.rows[0].id;
}

// ── Champion pick ────────────────────────────────────────────────────────────

async function pickChampion(sagiId) {
  const existing = await pool.query('SELECT 1 FROM tournament_winners WHERE user_id=$1', [sagiId]);
  if (existing.rows.length > 0) return;

  try {
    // Try to get outright winner odds (bet id 25 = To Win the World Cup / Tournament Winner)
    const data = await apiFetch('/odds?league=1&season=2026&bet=25');
    const values = data?.response?.[0]?.bookmakers?.[0]?.bets?.[0]?.values || [];

    if (values.length === 0) {
      console.log('Sagi champion: no outright odds available');
      return;
    }

    // Pick team with lowest (best) odds = most likely winner
    let bestOdds = Infinity, bestTeamName = null;
    for (const v of values) {
      const odd = parseFloat(v.odd);
      if (odd < bestOdds) { bestOdds = odd; bestTeamName = v.value; }
    }

    // Find team in DB by name
    const teamRes = await pool.query(
      `SELECT id FROM teams WHERE name_en ILIKE $1 OR name_he ILIKE $1 LIMIT 1`,
      [`%${bestTeamName}%`]
    );
    if (!teamRes.rows[0]) {
      console.log('Sagi champion: team not found in DB:', bestTeamName);
      return;
    }

    await pool.query(
      `INSERT INTO tournament_winners (user_id, team_id, points) VALUES ($1, $2, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      [sagiId, teamRes.rows[0].id]
    );
    console.log(`Sagi champion pick: ${bestTeamName} (odds ${bestOdds})`);
  } catch (e) {
    console.error('Sagi champion error:', e.message);
  }
}

// ── Top scorer pick ──────────────────────────────────────────────────────────

async function pickTopScorer(sagiId) {
  const existing = await pool.query('SELECT 1 FROM top_scorer_picks WHERE user_id=$1', [sagiId]);
  if (existing.rows.length > 0) return;

  try {
    // Bet id 177 = Top Goalscorer, or search by name
    const data = await apiFetch('/odds?league=1&season=2026&bet=177');
    const values = data?.response?.[0]?.bookmakers?.[0]?.bets?.[0]?.values || [];

    if (values.length === 0) {
      console.log('Sagi top scorer: no odds available');
      return;
    }

    // Lowest odds = most likely top scorer
    let bestOdds = Infinity, bestPlayerName = null;
    for (const v of values) {
      const odd = parseFloat(v.odd);
      if (odd < bestOdds) { bestOdds = odd; bestPlayerName = v.value; }
    }

    // Find player in DB by name (partial match)
    const parts = bestPlayerName ? bestPlayerName.split(' ') : [];
    const lastName = parts[parts.length - 1] || bestPlayerName;
    const playerRes = await pool.query(
      `SELECT id FROM players WHERE name ILIKE $1 LIMIT 1`,
      [`%${lastName}%`]
    );
    if (!playerRes.rows[0]) {
      console.log('Sagi top scorer: player not found in DB:', bestPlayerName);
      return;
    }

    await pool.query(
      `INSERT INTO top_scorer_picks (user_id, player_id, points) VALUES ($1, $2, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      [sagiId, playerRes.rows[0].id]
    );
    console.log(`Sagi top scorer pick: ${bestPlayerName} (odds ${bestOdds})`);
  } catch (e) {
    console.error('Sagi top scorer error:', e.message);
  }
}

// ── Place match bets ─────────────────────────────────────────────────────────

async function placeBets(sagiId) {
  // Matches starting in next 5min–24h with no Sagi prediction yet
  const matches = await pool.query(`
    SELECT m.id, m.apisports_id, m.stage
    FROM matches m
    WHERE m.status = 'scheduled'
      AND m.match_date BETWEEN NOW() + INTERVAL '5 minutes' AND NOW() + INTERVAL '24 hours'
      AND m.id NOT IN (SELECT match_id FROM predictions WHERE user_id = $1)
  `, [sagiId]);

  for (const match of matches.rows) {
    if (!match.apisports_id) continue;

    try {
      const data = await apiFetch(`/odds?fixture=${match.apisports_id}`);
      let homeOdds = 2.5, drawOdds = 3.2, awayOdds = 2.5; // fallback balanced

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

      const [h, a] = generateScore(homeOdds, drawOdds, awayOdds);

      await pool.query(
        `INSERT INTO predictions (user_id, match_id, home_score, away_score, is_double, points)
         VALUES ($1, $2, $3, $4, false, NULL)
         ON CONFLICT (user_id, match_id) DO NOTHING`,
        [sagiId, match.id, h, a]
      );
      console.log(new Date().toISOString(), `Sagi bet match ${match.id}: ${h}-${a} (odds ${homeOdds}/${drawOdds}/${awayOdds})`);
    } catch (e) {
      console.error('Sagi bet error match', match.id, e.message);
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
  } catch (e) {
    console.error(new Date().toISOString(), 'Sagi bot error:', e.message);
  }
}

run();
setInterval(run, 10 * 60 * 1000); // every 10 minutes
