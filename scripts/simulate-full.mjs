#!/usr/bin/env node
/**
 * Full tournament simulation.
 * Run once: node scripts/simulate-full.mjs
 * Populates DB with test users, predictions, match results, goals, points.
 * All data is visible in the live app.
 */
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:!Meggie4life@localhost:5432/mondial_2026' });
const Q = (t, p) => pool.query(t, p);

// Deterministic pseudo-random [0,1) — same seed always gives same number
function rand(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

// Generate a plausible prediction given actual score and user accuracy
function predict(actualH, actualA, userId, matchId, accuracy) {
  const r = rand(userId * 997 + matchId * 13);
  const r2 = rand(userId * 1009 + matchId * 7 + 1);
  const outcome = actualH > actualA ? 'H' : actualH < actualA ? 'A' : 'D';

  if (r < accuracy * 0.38) {
    return [actualH, actualA]; // exact score
  } else if (r < accuracy * 0.85) {
    // correct winner, nudged score
    if (outcome === 'H') {
      const h = Math.max(1, actualH + (r2 < 0.4 ? -1 : 0));
      const a = Math.max(0, actualA + (r2 > 0.7 ? 1 : 0));
      return [h, a < h ? a : Math.max(0, h - 1)];
    }
    if (outcome === 'A') {
      const a = Math.max(1, actualA + (r2 < 0.4 ? -1 : 0));
      const h = Math.max(0, actualH + (r2 > 0.7 ? 1 : 0));
      return [h < a ? h : Math.max(0, a - 1), a];
    }
    const s = Math.floor(r2 * 2); return [s, s]; // draw different score
  } else {
    // wrong
    if (outcome === 'H') return r2 < 0.6 ? [0, 1] : [1, 1];
    if (outcome === 'A') return r2 < 0.6 ? [1, 0] : [1, 1];
    return r2 < 0.5 ? [2, 0] : [0, 2];
  }
}

// ─── Users ───────────────────────────────────────────────────────────────────
const TEST_USERS = [
  { username: 'michael', name: 'מיכאל', pin: '5555', acc: 0.65, champId: 90,  scorerId: 431,  gDbl: 201, kDbl: 'SIM-R32-01' },
  { username: 'rachel',  name: 'רחל',   pin: '6666', acc: 0.55, champId: 87,  scorerId: 1113, gDbl: 176, kDbl: 'SIM-R32-02' },
  { username: 'danny',   name: 'דני',   pin: '7777', acc: 0.50, champId: 105, scorerId: 862,  gDbl: 189, kDbl: 'SIM-R32-07' },
  { username: 'tamar',   name: 'תמר',   pin: '8888', acc: 0.60, champId: 116, scorerId: 1204, gDbl: 183, kDbl: 'SIM-R16-03' },
  { username: 'nir',     name: 'ניר',   pin: '9999', acc: 0.58, champId: 104, scorerId: 860,  gDbl: 184, kDbl: 'SIM-QF-03'  },
  { username: 'oren',    name: 'אורן',  pin: '1111', acc: 0.55, champId: 106, scorerId: 880,  gDbl: 191, kDbl: 'SIM-R16-08' },
];

// Existing users (id known). champId/scorerId set only if not already picked.
const EXISTING_USERS = [
  { id: 1, acc: 0.72, champId: 90,  scorerId: 284,  gDbl: 222, kDbl: 'SIM-FINAL'  }, // דור: Brazil, Raphinha
  { id: 2, acc: 0.62, champId: 93,  scorerId: 404,  gDbl: 207, kDbl: 'SIM-SF-01'  }, // יואב: Spain, Yamal
  { id: 3, acc: 0.55, champId: 94,  scorerId: 449,  gDbl: 192, kDbl: 'SIM-QF-01'  }, // שי: England, Kane
  { id: 4, acc: 0.58, champId: 90,  scorerId: 1113, gDbl: 187, kDbl: 'SIM-SF-02'  }, // שגיא (bot): Brazil, Haaland
];

// ─── Group Stage Scores: matchId → [homeScore, awayScore] ─────────────────────
const GROUP_SCORES = {
  // A: Mexico(99) S.Korea(100) Czech(110) S.Africa(120)
  171:[3,0], 172:[1,0], 195:[3,0], 198:[1,0], 223:[1,2], 224:[0,2],
  // B: Canada(132) Qatar(126) Switzerland(98) Bosnia(115)
  173:[2,0], 175:[0,2], 196:[1,0], 197:[2,1], 219:[1,2], 220:[2,1],
  // C: Brazil(90) Morocco(108) Haiti(130) Scotland(114)
  176:[3,0], 177:[0,2], 200:[0,2], 201:[4,1], 221:[2,0], 222:[0,3],
  // D: USA(129) Paraguay(127) Australia(101) Turkey(112)
  174:[2,0], 178:[0,2], 199:[3,1], 202:[2,0], 229:[1,2], 230:[1,1],
  // E: Germany(104) Ivory Coast(117) Ecuador(128) Curacao(133)
  179:[4,0], 181:[2,0], 204:[3,1], 205:[5,0], 225:[1,2], 226:[0,3],
  // F: Netherlands(116) Japan(96) Sweden(89) Tunisia(107)
  180:[2,0], 182:[2,1], 203:[2,1], 206:[0,2], 227:[1,2], 228:[1,3],
  // G: Belgium(86) Iran(102) Egypt(109) New Zealand(131)
  184:[3,0], 186:[2,0], 208:[2,0], 210:[0,2], 235:[0,1], 236:[0,4],
  // H: Spain(93) Saudi Arabia(103) Uruguay(91) Cape Verde(122)
  183:[3,0], 185:[0,2], 207:[2,0], 209:[4,0], 233:[1,2], 234:[0,1],
  // I: France(87) Iraq(124) Norway(113) Senegal(97)
  187:[3,0], 188:[0,2], 212:[2,1], 213:[2,0], 231:[2,0], 232:[0,1],
  // J: Argentina(105) Algeria(121) Austria(111) Jordan(123)
  189:[3,0], 190:[2,0], 211:[3,1], 214:[0,2], 241:[1,2], 242:[0,4],
  // K: Portugal(106) Congo(119) Uzbekistan(125) Colombia(92)
  191:[3,0], 194:[0,3], 215:[2,0], 218:[3,1], 239:[0,1], 240:[2,0],
  // L: England(94) Croatia(88) Ghana(118) Panama(95)
  192:[3,0], 193:[1,0], 216:[2,1], 217:[1,2], 237:[2,1], 238:[0,3],
};

// ─── Knockout Bracket ─────────────────────────────────────────────────────────
// Champion: Brazil (id 90). Raphinha top scorer with 7 goals.
const KO_MATCHES = [
  // Round of 32
  { a:'SIM-R32-01', h:90,  aw:128, s:'round_of_32',  sc:[3,1], d:'2026-04-20 20:00+03' }, // Brazil vs Ecuador
  { a:'SIM-R32-02', h:87,  aw:115, s:'round_of_32',  sc:[2,0], d:'2026-04-20 23:00+03' }, // France vs Bosnia
  { a:'SIM-R32-03', h:93,  aw:119, s:'round_of_32',  sc:[4,0], d:'2026-04-21 02:00+03' }, // Spain vs Congo
  { a:'SIM-R32-04', h:94,  aw:109, s:'round_of_32',  sc:[2,0], d:'2026-04-21 05:00+03' }, // England vs Egypt
  { a:'SIM-R32-05', h:104, aw:96,  s:'round_of_32',  sc:[2,1], d:'2026-04-21 20:00+03' }, // Germany vs Japan
  { a:'SIM-R32-06', h:116, aw:118, s:'round_of_32',  sc:[2,0], d:'2026-04-21 23:00+03' }, // Netherlands vs Ghana
  { a:'SIM-R32-07', h:105, aw:121, s:'round_of_32',  sc:[2,0], d:'2026-04-22 02:00+03' }, // Argentina vs Algeria
  { a:'SIM-R32-08', h:106, aw:110, s:'round_of_32',  sc:[2,1], d:'2026-04-22 05:00+03' }, // Portugal vs Czech
  { a:'SIM-R32-09', h:99,  aw:88,  s:'round_of_32',  sc:[2,1], d:'2026-04-22 20:00+03' }, // Mexico vs Croatia
  { a:'SIM-R32-10', h:129, aw:113, s:'round_of_32',  sc:[1,0], d:'2026-04-22 23:00+03' }, // USA vs Norway
  { a:'SIM-R32-11', h:86,  aw:98,  s:'round_of_32',  sc:[2,0], d:'2026-04-23 02:00+03' }, // Belgium vs Switzerland
  { a:'SIM-R32-12', h:132, aw:108, s:'round_of_32',  sc:[2,1], d:'2026-04-23 05:00+03' }, // Canada vs Morocco
  { a:'SIM-R32-13', h:112, aw:100, s:'round_of_32',  sc:[2,0], d:'2026-04-23 20:00+03' }, // Turkey vs S.Korea
  { a:'SIM-R32-14', h:89,  aw:92,  s:'round_of_32',  sc:[1,2], d:'2026-04-23 23:00+03' }, // Sweden vs Colombia → Colombia wins
  { a:'SIM-R32-15', h:117, aw:91,  s:'round_of_32',  sc:[0,1], d:'2026-04-24 02:00+03' }, // Ivory Coast vs Uruguay → Uruguay wins
  { a:'SIM-R32-16', h:111, aw:102, s:'round_of_32',  sc:[2,0], d:'2026-04-24 05:00+03' }, // Austria vs Iran
  // Round of 16 (R32 winners: Brazil,France,Spain,England,Germany,NL,Argentina,Portugal,Mexico,USA,Belgium,Canada,Turkey,Colombia,Uruguay,Austria)
  { a:'SIM-R16-01', h:90,  aw:111, s:'round_of_16',  sc:[2,0], d:'2026-04-27 20:00+03' }, // Brazil vs Austria
  { a:'SIM-R16-02', h:87,  aw:112, s:'round_of_16',  sc:[2,0], d:'2026-04-27 23:00+03' }, // France vs Turkey
  { a:'SIM-R16-03', h:93,  aw:92,  s:'round_of_16',  sc:[2,1], d:'2026-04-28 02:00+03' }, // Spain vs Colombia
  { a:'SIM-R16-04', h:94,  aw:91,  s:'round_of_16',  sc:[1,0], d:'2026-04-28 05:00+03' }, // England vs Uruguay
  { a:'SIM-R16-05', h:104, aw:99,  s:'round_of_16',  sc:[2,1], d:'2026-04-28 20:00+03' }, // Germany vs Mexico
  { a:'SIM-R16-06', h:116, aw:86,  s:'round_of_16',  sc:[1,0], d:'2026-04-28 23:00+03' }, // Netherlands vs Belgium
  { a:'SIM-R16-07', h:105, aw:132, s:'round_of_16',  sc:[3,0], d:'2026-04-29 02:00+03' }, // Argentina vs Canada
  { a:'SIM-R16-08', h:106, aw:129, s:'round_of_16',  sc:[2,0], d:'2026-04-29 05:00+03' }, // Portugal vs USA
  // Quarter Finals (R16 winners: Brazil,France,Spain,England,Germany,NL,Argentina,Portugal)
  { a:'SIM-QF-01',  h:90,  aw:94,  s:'quarter_final', sc:[2,1], d:'2026-05-03 22:00+03' }, // Brazil vs England
  { a:'SIM-QF-02',  h:87,  aw:106, s:'quarter_final', sc:[2,0], d:'2026-05-04 02:00+03' }, // France vs Portugal
  { a:'SIM-QF-03',  h:93,  aw:104, s:'quarter_final', sc:[2,1], d:'2026-05-04 22:00+03' }, // Spain vs Germany
  { a:'SIM-QF-04',  h:105, aw:116, s:'quarter_final', sc:[1,0], d:'2026-05-05 02:00+03' }, // Argentina vs Netherlands
  // Semi Finals (QF winners: Brazil,France,Spain,Argentina)
  { a:'SIM-SF-01',  h:90,  aw:93,  s:'semi_final',    sc:[1,0], d:'2026-05-08 22:00+03' }, // Brazil vs Spain
  { a:'SIM-SF-02',  h:87,  aw:105, s:'semi_final',    sc:[2,1], d:'2026-05-09 22:00+03' }, // France vs Argentina
  // Third Place (losers: Spain, Argentina)
  { a:'SIM-3P-01',  h:93,  aw:105, s:'third_place',   sc:[2,1], d:'2026-05-13 21:00+03' }, // Spain vs Argentina
  // FINAL → Brazil wins 🏆
  { a:'SIM-FINAL',  h:90,  aw:87,  s:'final',         sc:[2,1], d:'2026-05-14 22:00+03' }, // Brazil vs France
];

// ─── Goal events for top scorer tracking ─────────────────────────────────────
// Format: [matchApiId_or_groupMatchId, teamId, playerName, elapsed]
// Raphinha 7 goals, Yamal 5, Kane 4, Gakpo 4, Lautaro 4, Haaland 4, Bellingham 3, Messi 3, Bruno 3
const GOAL_EVENTS = [
  // Raphinha (Brazil 90) — 7 goals
  [176,  90, 'Raphinha',          23],
  [201,  90, 'Raphinha',          12],
  [201,  90, 'Raphinha',          67],
  [222,  90, 'Raphinha',          55],
  ['SIM-R32-01', 90, 'Raphinha',  34],
  ['SIM-R16-01', 90, 'Raphinha',  45],
  ['SIM-QF-01',  90, 'Raphinha',  78],
  // Lamine Yamal (Spain 93) — 5 goals
  [183,  93, 'Lamine Yamal',      15],
  [207,  93, 'Lamine Yamal',      33],
  [233,  93, 'Lamine Yamal',      71],
  ['SIM-R32-03', 93, 'Lamine Yamal', 20],
  ['SIM-R16-03', 93, 'Lamine Yamal', 55],
  // H. Kane (England 94) — 4 goals
  [192,  94, 'H. Kane',           20],
  [216,  94, 'H. Kane',           33],
  [238,  94, 'H. Kane',           60],
  ['SIM-R32-04', 94, 'H. Kane',   45],
  // C. Gakpo (Netherlands 116) — 4 goals
  [180, 116, 'C. Gakpo',          38],
  [203, 116, 'C. Gakpo',          61],
  ['SIM-R32-06', 116, 'C. Gakpo', 22],
  ['SIM-QF-04', 116, 'C. Gakpo',  55],
  // Lautaro Martínez (Argentina 105) — 4 goals
  [189, 105, 'Lautaro Martínez',  18],
  [211, 105, 'Lautaro Martínez',  44],
  [242, 105, 'Lautaro Martínez',  30],
  ['SIM-R16-07', 105, 'Lautaro Martínez', 35],
  // E. Haaland (Norway 113) — 4 goals
  [188, 113, 'E. Haaland',        40],
  [188, 113, 'E. Haaland',        80],
  [213, 113, 'E. Haaland',        22],
  [213, 113, 'E. Haaland',        70],
  // J. Bellingham (England 94) — 3 goals
  [192,  94, 'J. Bellingham',     55],
  [238,  94, 'J. Bellingham',     72],
  ['SIM-QF-01', 94, 'J. Bellingham', 65],
  // L. Messi (Argentina 105) — 3 goals
  [189, 105, 'L. Messi',          66],
  [242, 105, 'L. Messi',          51],
  ['SIM-R32-07', 105, 'L. Messi', 38],
  // Bruno Fernandes (Portugal 106) — 3 goals
  [191, 106, 'Bruno Fernandes',   27],
  [215, 106, 'Bruno Fernandes',   54],
  [239, 106, 'Bruno Fernandes',   88],
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Starting full tournament simulation...\n');

  // ── 1. Create test users ──
  console.log('👥 Creating test users...');
  const userIds = {}; // username → id

  for (const u of TEST_USERS) {
    const hash = await bcrypt.hash(u.pin, 10);
    const res = await Q(
      `INSERT INTO users (username, display_name, pin_hash, is_first_login)
       VALUES ($1, $2, $3, false)
       ON CONFLICT (username) DO UPDATE SET display_name = $2
       RETURNING id`,
      [u.username, u.name, hash]
    );
    userIds[u.username] = res.rows[0].id;
    console.log(`  ✓ ${u.name} (id ${res.rows[0].id})`);
  }
  for (const u of EXISTING_USERS) {
    userIds[`existing_${u.id}`] = u.id;
  }

  // Build full user list with ids
  const allUsers = [
    ...EXISTING_USERS.map(u => ({ ...u, id: u.id })),
    ...TEST_USERS.map(u => ({ ...u, id: userIds[u.username] })),
  ];

  // ── 2. Champion picks ──
  console.log('\n🏆 Setting champion picks...');
  for (const u of allUsers) {
    await Q(
      `INSERT INTO tournament_winners (user_id, team_id) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET team_id = $2`,
      [u.id, u.champId]
    );
  }
  console.log(`  ✓ ${allUsers.length} champion picks set`);

  // ── 3. Top scorer picks ──
  console.log('\n👟 Setting top scorer picks...');
  for (const u of allUsers) {
    await Q(
      `INSERT INTO top_scorer_picks (user_id, player_id, points)
       VALUES ($1, $2, 0)
       ON CONFLICT (user_id) DO UPDATE SET player_id = $2, points = 0`,
      [u.id, u.scorerId]
    );
  }
  console.log(`  ✓ ${allUsers.length} top scorer picks set`);

  // ── 4. Group stage predictions ──
  console.log('\n📋 Inserting group stage predictions...');
  let groupPredCount = 0;
  for (const [matchIdStr, [ah, aa]] of Object.entries(GROUP_SCORES)) {
    const matchId = parseInt(matchIdStr);
    for (const u of allUsers) {
      const isDouble = u.gDbl === matchId;
      const [ph, pa] = predict(ah, aa, u.id, matchId, u.acc);
      await Q(
        `INSERT INTO predictions (user_id, match_id, home_score, away_score, is_double)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, match_id) DO NOTHING`,
        [u.id, matchId, ph, pa, isDouble]
      );
      groupPredCount++;
    }
  }
  console.log(`  ✓ ${groupPredCount} group predictions inserted`);

  // ── 5. Set group stage results ──
  console.log('\n⚽ Setting group stage results...');
  for (const [matchIdStr, [h, a]] of Object.entries(GROUP_SCORES)) {
    await Q(
      `UPDATE matches
       SET home_score=$1, away_score=$2, status='finished',
           match_date = match_date - INTERVAL '75 days'
       WHERE id=$3`,
      [h, a, parseInt(matchIdStr)]
    );
  }
  console.log(`  ✓ ${Object.keys(GROUP_SCORES).length} group matches finished`);

  // ── 6. Insert knockout matches ──
  console.log('\n🏟 Creating knockout matches...');
  const koMatchIds = {}; // apiId → db id

  for (const m of KO_MATCHES) {
    // Check if already exists
    const exists = await Q(`SELECT id FROM matches WHERE api_id=$1`, [m.a]);
    if (exists.rows.length > 0) {
      koMatchIds[m.a] = exists.rows[0].id;
      console.log(`  ~ ${m.a} already exists (id ${koMatchIds[m.a]})`);
      // Update score and status
      await Q(
        `UPDATE matches SET home_score=$1, away_score=$2, status='finished' WHERE id=$3`,
        [m.sc[0], m.sc[1], koMatchIds[m.a]]
      );
      continue;
    }
    const res = await Q(
      `INSERT INTO matches (api_id, home_team_id, away_team_id, stage, status, home_score, away_score, match_date)
       VALUES ($1, $2, $3, $4, 'finished', $5, $6, $7)
       RETURNING id`,
      [m.a, m.h, m.aw, m.s, m.sc[0], m.sc[1], m.d]
    );
    koMatchIds[m.a] = res.rows[0].id;
    console.log(`  ✓ ${m.a} → id ${koMatchIds[m.a]} (${m.sc[0]}-${m.sc[1]})`);
  }

  // ── 7. Knockout predictions ──
  console.log('\n📋 Inserting knockout predictions...');
  let koPredCount = 0;
  for (const m of KO_MATCHES) {
    const dbId = koMatchIds[m.a];
    const [ah, aa] = m.sc;
    for (const u of allUsers) {
      const isDouble = u.kDbl === m.a;
      const [ph, pa] = predict(ah, aa, u.id, dbId, u.acc);
      await Q(
        `INSERT INTO predictions (user_id, match_id, home_score, away_score, is_double)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, match_id) DO NOTHING`,
        [u.id, dbId, ph, pa, isDouble]
      );
      koPredCount++;
    }
  }
  console.log(`  ✓ ${koPredCount} knockout predictions inserted`);

  // ── 8. Insert goal events ──
  console.log('\n⚽ Inserting goal events...');
  let goalCount = 0;
  for (const [matchRef, teamId, playerName, elapsed] of GOAL_EVENTS) {
    let matchId;
    if (typeof matchRef === 'number') {
      matchId = matchRef; // group stage match id
    } else {
      matchId = koMatchIds[matchRef];
    }
    if (!matchId) { console.warn(`  ⚠ Match ${matchRef} not found for ${playerName}`); continue; }

    await Q(
      `INSERT INTO match_events (match_id, elapsed, event_type, detail, team_id, player_name)
       VALUES ($1, $2, 'goal', 'Normal Goal', $3, $4)
       ON CONFLICT (match_id, elapsed, event_type, player_name) DO NOTHING`,
      [matchId, elapsed, teamId, playerName]
    );
    goalCount++;
  }
  console.log(`  ✓ ${goalCount} goal events inserted`);

  // ── 9. Calculate prediction points ──
  console.log('\n🧮 Calculating prediction points...');
  await Q(`
    UPDATE predictions p
    SET points = (
      CASE
        WHEN p.home_score = m.home_score AND p.away_score = m.away_score THEN
          CASE WHEN m.stage != 'group' THEN (CASE WHEN p.is_double THEN 12 ELSE 6 END)
               ELSE (CASE WHEN p.is_double THEN 6 ELSE 3 END) END
        WHEN
          (p.home_score > p.away_score AND m.home_score > m.away_score) OR
          (p.home_score < p.away_score AND m.home_score < m.away_score) OR
          (p.home_score = p.away_score AND m.home_score = m.away_score) THEN
          CASE WHEN m.stage != 'group' THEN (CASE WHEN p.is_double THEN 4 ELSE 2 END)
               ELSE (CASE WHEN p.is_double THEN 2 ELSE 1 END) END
        ELSE 0
      END
    )
    FROM matches m
    WHERE p.match_id = m.id AND m.status = 'finished' AND m.home_score IS NOT NULL
  `);
  console.log('  ✓ Points calculated for all predictions');

  // ── 10. Calculate top scorer points ──
  console.log('\n👟 Calculating top scorer points...');
  await Q(`
    UPDATE top_scorer_picks tsp
    SET points = (
      SELECT COUNT(*)
      FROM match_events me
      JOIN players pl ON pl.id = tsp.player_id
      WHERE me.event_type = 'goal'
        AND me.player_name = pl.name
    )
  `);
  console.log('  ✓ Top scorer points calculated');

  // ── 11. Champion points (Brazil id=90 won) ──
  console.log('\n🏆 Awarding champion points...');
  const champResult = await Q(`
    UPDATE tournament_winners SET points = 8
    WHERE team_id = 90
    RETURNING user_id
  `);
  console.log(`  ✓ 8 points awarded to ${champResult.rowCount} user(s) who picked Brazil`);

  // ── 12. Summary ──
  console.log('\n📊 Leaderboard preview:');
  const lb = await Q(`
    SELECT
      u.display_name,
      COALESCE(SUM(p.points), 0) + COALESCE(tw.points, 0) + COALESCE(ts.points, 0) AS total,
      COALESCE(SUM(p.points), 0) AS pred_pts,
      COALESCE(tw.points, 0) AS champ_pts,
      COALESCE(ts.points, 0) AS scorer_pts
    FROM users u
    LEFT JOIN predictions p ON p.user_id = u.id
    LEFT JOIN tournament_winners tw ON tw.user_id = u.id
    LEFT JOIN top_scorer_picks ts ON ts.user_id = u.id
    WHERE u.is_bot = false
    GROUP BY u.id, u.display_name, tw.points, ts.points
    ORDER BY total DESC
  `);
  for (const row of lb.rows) {
    console.log(`  ${row.display_name.padEnd(10)} total=${row.total}  pred=${row.pred_pts}  champ=${row.champ_pts}  scorer=${row.scorer_pts}`);
  }

  await pool.end();
  console.log('\n✅ Simulation complete! Refresh the app to see results.');
}

main().catch(e => { console.error(e); pool.end(); process.exit(1); });
