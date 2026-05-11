import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { userId, matchId, homeScore, awayScore, isDouble } = await req.json();

    await query(`
      INSERT INTO predictions (user_id, match_id, home_score, away_score, is_double)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, match_id)
      DO UPDATE SET home_score = $3, away_score = $4, is_double = $5, updated_at = NOW()
    `, [userId, matchId, homeScore, awayScore, isDouble || false]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('matchId');

    const result = await query(`
      SELECT p.*, u.display_name, u.username
      FROM predictions p
      JOIN users u ON p.user_id = u.id
      WHERE p.match_id = $1
      ORDER BY u.display_name
    `, [matchId]);

    const usersResult = await query(
      'SELECT id, username, display_name FROM users WHERE is_admin = FALSE ORDER BY display_name'
    );

    return NextResponse.json({ predictions: result.rows, users: usersResult.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
