import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/session';
import { isMatchLocked } from '@/lib/time';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

    const { matchId, homeScore, awayScore, isDouble } = await req.json();

    if (homeScore === undefined || awayScore === undefined || homeScore < 0 || awayScore < 0) {
      return NextResponse.json({ error: 'נתוני תחזית שגויים' }, { status: 400 });
    }

    // Get match details
    const matchResult = await query('SELECT * FROM matches WHERE id = $1', [matchId]);
    if (matchResult.rows.length === 0) {
      return NextResponse.json({ error: 'משחק לא נמצא' }, { status: 404 });
    }

    const match = matchResult.rows[0];

    if (isMatchLocked(match.match_date)) {
      return NextResponse.json({ error: 'הגשת תחזיות נעולה' }, { status: 403 });
    }

    // Check double availability
    if (isDouble) {
      const stage = match.stage === 'group' ? 'group' : 'knockout';
      const existingDoubleResult = await query(`
        SELECT p.id FROM predictions p
        JOIN matches m ON p.match_id = m.id
        WHERE p.user_id = $1
          AND p.is_double = TRUE
          AND p.match_id != $2
          AND (
            ($3 = 'group' AND m.stage = 'group') OR
            ($3 = 'knockout' AND m.stage != 'group')
          )
      `, [session.id, matchId, stage]);

      if (existingDoubleResult.rows.length > 0) {
        return NextResponse.json({ error: 'כבר השתמשת בנקודות הכפל לשלב זה' }, { status: 400 });
      }
    }

    // Upsert prediction
    await query(`
      INSERT INTO predictions (user_id, match_id, home_score, away_score, is_double)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, match_id)
      DO UPDATE SET home_score = $3, away_score = $4, is_double = $5, updated_at = NOW()
    `, [session.id, matchId, homeScore, awayScore, isDouble || false]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Prediction error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
