import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/session';

async function getTournamentStarted() {
  const firstMatch = await query('SELECT match_date FROM matches ORDER BY match_date ASC LIMIT 1');
  return firstMatch.rows.length > 0 && new Date() >= new Date(firstMatch.rows[0].match_date);
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

    const pickResult = await query(`
      SELECT tsp.*, p.name as player_name, p.photo_url, p.api_id as player_api_id,
             t.name_he as team_name_he, t.flag_emoji as team_flag
      FROM top_scorer_picks tsp
      JOIN players p ON p.id = tsp.player_id
      JOIN teams t ON t.id = p.team_id
      WHERE tsp.user_id = $1
    `, [session.id]);

    const tournamentStarted = await getTournamentStarted();

    return NextResponse.json({
      pick: pickResult.rows[0] || null,
      tournamentStarted,
    });
  } catch (error) {
    console.error('Top scorer GET error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

    const tournamentStarted = await getTournamentStarted();
    if (tournamentStarted) {
      return NextResponse.json({ error: 'הטורניר כבר התחיל, לא ניתן לשנות' }, { status: 403 });
    }

    const { playerId } = await req.json();
    if (!playerId) return NextResponse.json({ error: 'יש לבחור שחקן' }, { status: 400 });

    await query(`
      INSERT INTO top_scorer_picks (user_id, player_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET player_id = $2
    `, [session.id, playerId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Top scorer POST error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
