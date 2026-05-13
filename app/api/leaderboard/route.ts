import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

    const result = await query(`
      SELECT
        u.id as user_id,
        u.display_name,
        COALESCE(SUM(p.points), 0) + COALESCE(tw.points, 0) + COALESCE(tsp.points, 0) as total_points,
        COUNT(CASE WHEN p.points = 3 OR p.points = 6 THEN 1 END) as exact_scores,
        COUNT(CASE WHEN p.points = 1 OR p.points = 2 THEN 1 END) as correct_winners,
        COUNT(CASE WHEN p.points IS NOT NULL AND p.points > 0 THEN 1 END) as correct_predictions,
        COUNT(p.id) as total_predictions,
        tw.team_id as champion_team_id,
        ct.name_he as champion_name,
        ct.flag_emoji as champion_flag,
        pl.name as top_scorer_name,
        pl.photo_url as top_scorer_photo,
        pt.flag_emoji as top_scorer_team_flag
      FROM users u
      LEFT JOIN predictions p ON p.user_id = u.id AND p.points IS NOT NULL
      LEFT JOIN tournament_winners tw ON tw.user_id = u.id
      LEFT JOIN teams ct ON ct.id = tw.team_id
      LEFT JOIN top_scorer_picks tsp ON tsp.user_id = u.id
      LEFT JOIN players pl ON pl.id = tsp.player_id
      LEFT JOIN teams pt ON pt.id = pl.team_id
      WHERE u.is_admin = FALSE
      GROUP BY u.id, u.display_name, tw.points, tw.team_id, ct.name_he, ct.flag_emoji,
               tsp.points, pl.name, pl.photo_url, pt.flag_emoji
      ORDER BY total_points DESC, exact_scores DESC, correct_winners DESC
    `);

    const rows = result.rows.map((row, idx) => ({
      ...row,
      rank: idx + 1,
      success_rate: row.total_predictions > 0
        ? Math.round((row.correct_predictions / row.total_predictions) * 100)
        : 0,
    }));

    // Tournament started = first match date has passed
    const firstMatchResult = await query(
      "SELECT match_date FROM matches ORDER BY match_date ASC LIMIT 1"
    );
    const tournamentStarted = firstMatchResult.rows.length > 0
      && new Date() >= new Date(firstMatchResult.rows[0].match_date);

    // Check if final match is live - hide leaderboard
    const finalResult = await query(
      "SELECT * FROM matches WHERE stage = 'final' AND status = 'live' LIMIT 1"
    );

    // Hide special picks until tournament starts
    const leaderboard = rows.map(row => ({
      ...row,
      champion_name: tournamentStarted ? row.champion_name : null,
      champion_flag: tournamentStarted ? row.champion_flag : null,
      top_scorer_name: tournamentStarted ? row.top_scorer_name : null,
      top_scorer_photo: tournamentStarted ? row.top_scorer_photo : null,
      top_scorer_team_flag: tournamentStarted ? row.top_scorer_team_flag : null,
    }));

    return NextResponse.json({
      leaderboard,
      hiddenDuringFinal: finalResult.rows.length > 0,
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
