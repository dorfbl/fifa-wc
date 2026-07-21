const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const PLAYOFF_STAGES = new Set(['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final']);

function isPlayoffStage(stage) {
  return PLAYOFF_STAGES.has(stage);
}

function calculatePoints(predHome, predAway, actualHome, actualAway, isDouble, stage) {
  // For 120-minute calculation, we use the actual final score (no score_90 adjustment)
  let points = 0;

  if (predHome === actualHome && predAway === actualAway) {
    points = 3;
  } else {
    const predWinner = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
    const actualWinner = actualHome > actualAway ? 'home' : actualHome < actualAway ? 'away' : 'draw';
    if (predWinner === actualWinner) {
      points = 1;
    }
  }

  if (isPlayoffStage(stage)) points *= 2;

  return isDouble ? points * 2 : points;
}

async function main() {
  try {
    // Get all users
    const usersResult = await pool.query(`
      SELECT id, display_name 
      FROM users 
      WHERE is_admin = FALSE
      ORDER BY display_name
    `);

    // Get all matches
    const matchesResult = await pool.query(`
      SELECT id, stage, home_score, away_score, score_90_home, score_90_away
      FROM matches
      WHERE home_score IS NOT NULL AND away_score IS NOT NULL
    `);

    // Get all predictions
    const predictionsResult = await pool.query(`
      SELECT user_id, match_id, home_score, away_score, is_double
      FROM predictions
    `);

    // Build match lookup
    const matches = {};
    matchesResult.rows.forEach(m => {
      matches[m.id] = m;
    });

    // Calculate points per user
    const userPoints = {};
    usersResult.rows.forEach(u => {
      userPoints[u.id] = {
        name: u.display_name,
        points: 0
      };
    });

    predictionsResult.rows.forEach(pred => {
      const match = matches[pred.match_id];
      if (!match) return;

      // Use the FINAL score (120 min) instead of 90 min
      const points = calculatePoints(
        pred.home_score,
        pred.away_score,
        match.home_score,
        match.away_score,
        pred.is_double,
        match.stage
      );

      if (userPoints[pred.user_id]) {
        userPoints[pred.user_id].points += points;
      }
    });

    // Get tournament winner and top scorer points
    const specialPointsResult = await pool.query(`
      SELECT 
        u.id as user_id,
        COALESCE(tw.points, 0) + COALESCE(tsp.points, 0) as special_points
      FROM users u
      LEFT JOIN tournament_winners tw ON tw.user_id = u.id
      LEFT JOIN top_scorer_picks tsp ON tsp.user_id = u.id
      WHERE u.is_admin = FALSE
    `);

    specialPointsResult.rows.forEach(row => {
      if (userPoints[row.user_id]) {
        userPoints[row.user_id].points += row.special_points;
      }
    });

    // Convert to array and sort
    const leaderboard = Object.entries(userPoints)
      .map(([userId, data]) => ({
        name: data.name,
        points: data.points
      }))
      .sort((a, b) => b.points - a.points);

    // Print table
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║   Leaderboard - All Playoff Matches Scored at 120 Minutes    ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║ Rank │ Player Name                           │ Total Points   ║');
    console.log('╠══════╪═══════════════════════════════════════╪════════════════╣');
    
    leaderboard.forEach((player, index) => {
      const rank = (index + 1).toString().padStart(4);
      const name = player.name.padEnd(37);
      const points = player.points.toString().padStart(14);
      console.log(`║ ${rank} │ ${name} │ ${points} ║`);
    });
    
    console.log('╚══════╧═══════════════════════════════════════╧════════════════╝\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main();
