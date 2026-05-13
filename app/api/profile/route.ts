import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

    const statsResult = await query(`
      SELECT
        COALESCE(SUM(p.points), 0) as total_points,
        COUNT(CASE WHEN p.points = 3 OR p.points = 6 THEN 1 END) as exact_scores,
        COUNT(CASE WHEN p.points = 1 OR p.points = 2 THEN 1 END) as correct_winners,
        COUNT(CASE WHEN p.points IS NOT NULL AND p.points > 0 THEN 1 END) as correct_predictions,
        COUNT(p.id) as total_predictions
      FROM predictions p
      WHERE p.user_id = $1 AND p.points IS NOT NULL
    `, [session.id]);

    const rankResult = await query(`
      SELECT rank FROM (
        SELECT u.id,
          RANK() OVER (ORDER BY
            COALESCE(SUM(p.points), 0) + COALESCE(tw.points, 0) + COALESCE(tsp.points, 0) DESC,
            COUNT(CASE WHEN p.points = 3 OR p.points = 6 THEN 1 END) DESC,
            COUNT(CASE WHEN p.points = 1 OR p.points = 2 THEN 1 END) DESC) as rank
        FROM users u
        LEFT JOIN predictions p ON p.user_id = u.id AND p.points IS NOT NULL
        LEFT JOIN tournament_winners tw ON tw.user_id = u.id
        LEFT JOIN top_scorer_picks tsp ON tsp.user_id = u.id
        WHERE u.is_admin = FALSE
        GROUP BY u.id, tw.points, tsp.points
      ) ranked WHERE id = $1
    `, [session.id]);

    const doublesResult = await query(`
      SELECT
        COUNT(CASE WHEN m.stage = 'group' AND p.is_double = TRUE THEN 1 END) as group_doubles_used,
        COUNT(CASE WHEN m.stage != 'group' AND p.is_double = TRUE THEN 1 END) as knockout_doubles_used
      FROM predictions p
      JOIN matches m ON p.match_id = m.id
      WHERE p.user_id = $1
    `, [session.id]);

    const championResult = await query(`
      SELECT tw.*, t.name_he, t.flag_emoji
      FROM tournament_winners tw
      JOIN teams t ON t.id = tw.team_id
      WHERE tw.user_id = $1
    `, [session.id]);

    const topScorerResult = await query(`
      SELECT tsp.*, pl.name as player_name, pl.photo_url,
             t.name_he as team_name_he, t.flag_emoji as team_flag
      FROM top_scorer_picks tsp
      JOIN players pl ON pl.id = tsp.player_id
      JOIN teams t ON t.id = pl.team_id
      WHERE tsp.user_id = $1
    `, [session.id]);

    const firstMatch = await query(
      "SELECT match_date FROM matches ORDER BY match_date ASC LIMIT 1"
    );
    const tournamentStarted = firstMatch.rows.length > 0
      && new Date() >= new Date(firstMatch.rows[0].match_date);

    const stats = statsResult.rows[0];
    const doubles = doublesResult.rows[0];
    const championPts = championResult.rows[0]?.points || 0;
    const topScorerPts = topScorerResult.rows[0]?.points || 0;

    return NextResponse.json({
      display_name: session.display_name,
      total_points: parseInt(stats.total_points) + championPts + topScorerPts,
      rank: rankResult.rows[0]?.rank || '-',
      exact_scores: parseInt(stats.exact_scores),
      correct_winners: parseInt(stats.correct_winners),
      total_predictions: parseInt(stats.total_predictions),
      success_rate: stats.total_predictions > 0
        ? Math.round((stats.correct_predictions / stats.total_predictions) * 100)
        : 0,
      group_double_available: parseInt(doubles.group_doubles_used) === 0,
      knockout_double_available: parseInt(doubles.knockout_doubles_used) === 0,
      champion: championResult.rows[0] || null,
      top_scorer: topScorerResult.rows[0] || null,
      tournament_started: tournamentStarted,
    });
  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
