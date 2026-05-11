import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

    const result = await query(`
      SELECT tw.*, t.name_he, t.flag_emoji
      FROM tournament_winners tw
      JOIN teams t ON t.id = tw.team_id
      WHERE tw.user_id = $1
    `, [session.id]);

    // Tournament started = first match date has passed
    const firstMatch = await query(
      "SELECT match_date FROM matches ORDER BY match_date ASC LIMIT 1"
    );
    const tournamentStarted = firstMatch.rows.length > 0
      && new Date() >= new Date(firstMatch.rows[0].match_date);

    return NextResponse.json({
      winner: result.rows[0] || null,
      tournamentStarted,
    });
  } catch (error) {
    console.error('Tournament winner GET error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

    // Block if first match has already started
    const firstMatch = await query(
      "SELECT match_date FROM matches ORDER BY match_date ASC LIMIT 1"
    );
    if (firstMatch.rows.length > 0 && new Date() >= new Date(firstMatch.rows[0].match_date)) {
      return NextResponse.json({ error: 'הטורניר כבר התחיל, לא ניתן לשנות' }, { status: 403 });
    }

    const { teamId } = await req.json();
    if (!teamId) return NextResponse.json({ error: 'יש לבחור קבוצה' }, { status: 400 });

    await query(`
      INSERT INTO tournament_winners (user_id, team_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET team_id = $2
    `, [session.id, teamId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Tournament winner POST error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
