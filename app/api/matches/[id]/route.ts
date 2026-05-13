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

    // Get user's own prediction
    const predResult = await query(
      'SELECT * FROM predictions WHERE match_id = $1 AND user_id = $2',
      [matchId, session.id]
    );

    // If match started, get all predictions
    const matchStarted = new Date() >= new Date(match.match_date);
    let allPredictions: unknown[] = [];
    if (matchStarted) {
      const allPredsResult = await query(`
        SELECT p.*, u.display_name, u.username
        FROM predictions p
        JOIN users u ON p.user_id = u.id
        WHERE p.match_id = $1
        ORDER BY p.points DESC NULLS LAST, p.home_score ASC
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
      allPredictions,
      matchStarted,
      events: eventsResult.rows,
    });
  } catch (error) {
    console.error('Match detail error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
