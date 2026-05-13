import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 10;
    const offset = (page - 1) * limit;

    const matchesResult = await query(`
      SELECT
        m.*,
        ht.id as home_team_id, ht.name_he as home_name_he, ht.flag_emoji as home_flag, ht.name_en as home_name_en,
        at.id as away_team_id, at.name_he as away_name_he, at.flag_emoji as away_flag, at.name_en as away_name_en,
        COALESCE(m.venue_name_api, v.name_he) as venue_name, COALESCE(m.venue_city_api, v.city_he) as venue_city, v.country_he as venue_country,
        ch.name_he as channel_name, ch.logo_url as channel_logo,
        p.home_score as pred_home, p.away_score as pred_away, p.is_double as pred_double, p.points as pred_points
      FROM matches m
      LEFT JOIN teams ht ON m.home_team_id = ht.id
      LEFT JOIN teams at ON m.away_team_id = at.id
      LEFT JOIN venues v ON m.venue_id = v.id
      LEFT JOIN channels ch ON m.channel_id = ch.id
      LEFT JOIN predictions p ON p.match_id = m.id AND p.user_id = $1
      ORDER BY m.match_date ASC
      LIMIT $2 OFFSET $3
    `, [session.id, limit, offset]);

    const countResult = await query('SELECT COUNT(*) FROM matches');
    const total = parseInt(countResult.rows[0].count);

    return NextResponse.json({
      matches: matchesResult.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Matches error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
