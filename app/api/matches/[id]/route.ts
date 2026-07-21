import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

    const matchId = parseInt(params.id);

    const matchResult = await query(`
      SELECT
        m.*,
        ht.name_he as home_name_he, ht.flag_emoji as home_flag, ht.name_en as home_name_en,
        at.name_he as away_name_he, at.flag_emoji as away_flag, at.name_en as away_name_en,
        COALESCE(m.venue_name_api, v.name_he) as venue_name, COALESCE(m.venue_city_api, v.city_he) as venue_city, v.country_he as venue_country,
        ch.name_he as channel_name, ch.logo_url as channel_logo
      FROM matches m
      LEFT JOIN teams ht ON m.home_team_id = ht.id
      LEFT JOIN teams at ON m.away_team_id = at.id
      LEFT JOIN venues v ON m.venue_id = v.id
      LEFT JOIN channels ch ON m.channel_id = ch.id
      WHERE m.id = $1
    `, [matchId]);

    if (matchResult.rows.length === 0) {
      return NextResponse.json({ error: 'משחק לא נמצא' }, { status: 404 });
    }

    const match = matchResult.rows[0];

    // Get user's own prediction + scorer bonus for this match
    const predResult = await query(`
      SELECT p.*,
        (SELECT COUNT(*)::int FROM match_events me
          JOIN players pl ON pl.api_id = me.player_api_id
          JOIN top_scorer_picks tsp ON tsp.player_id = pl.id AND tsp.user_id = $2
          WHERE me.match_id = p.match_id AND me.event_type='goal' AND me.detail NOT ILIKE '%own%'
        ) as scorer_bonus
      FROM predictions p WHERE p.match_id = $1 AND p.user_id = $2
    `, [matchId, session.id]);

    // Sagi's prediction (always visible)
    const sagiResult = await query(`
      SELECT p.home_score, p.away_score FROM predictions p
      JOIN users u ON u.id = p.user_id
      WHERE p.match_id = $1 AND u.is_bot = true LIMIT 1
    `, [matchId]);

    // Regular match predictions reveal at kickoff. Final predictions stay private
    // until the atomic tournament finalization transaction has completed.
    const matchStarted = new Date() >= new Date(match.match_date);
    let predictionsRevealed = matchStarted;
    if (match.stage === 'final') {
      const endedResult = await query(
        "SELECT value='true' AS finalized FROM settings WHERE key='tournament_ended' LIMIT 1"
      );
      predictionsRevealed = match.status === 'finished' && endedResult.rows[0]?.finalized === true;
    }
    let allPredictions: unknown[] = [];
    if (predictionsRevealed) {
      const allPredsResult = await query(`
        SELECT p.*, u.display_name, u.username,
          (SELECT COUNT(*)::int FROM match_events me
            JOIN players pl ON pl.api_id = me.player_api_id
            JOIN top_scorer_picks tsp ON tsp.player_id = pl.id AND tsp.user_id = p.user_id
            WHERE me.match_id = p.match_id AND me.event_type='goal' AND me.detail NOT ILIKE '%own%'
          ) as scorer_bonus
        FROM predictions p
        JOIN users u ON p.user_id = u.id
        WHERE p.match_id = $1
        ORDER BY (p.points + COALESCE((SELECT COUNT(*)::int FROM match_events me2
          JOIN players pl2 ON pl2.api_id = me2.player_api_id
          JOIN top_scorer_picks tsp2 ON tsp2.player_id = pl2.id AND tsp2.user_id = p.user_id
          WHERE me2.match_id = p.match_id AND me2.event_type='goal' AND me2.detail NOT ILIKE '%own%'), 0)) DESC NULLS LAST
      `, [matchId]);
      allPredictions = allPredsResult.rows;
    }

    // Get match events (goals, cards, subs)
    const eventsResult = await query(`
      SELECT me.*, t.name_he as team_name_he, t.flag_emoji as team_flag
      FROM match_events me
      LEFT JOIN teams t ON me.team_id = t.id
      WHERE me.match_id = $1
      ORDER BY me.elapsed ASC, me.id ASC
    `, [matchId]);

    return NextResponse.json({
      match,
      myPrediction: predResult.rows[0] || null,
      sagiPrediction: sagiResult.rows[0] || null,
      allPredictions,
      matchStarted,
      predictionsRevealed,
      events: eventsResult.rows,
    });
  } catch (error) {
    console.error('Match detail error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
