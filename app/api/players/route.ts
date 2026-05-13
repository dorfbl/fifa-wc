import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

    const result = await query(`
      SELECT p.id, p.api_id, p.name, p.photo_url,
             COALESCE(t.id, 0) as team_id,
             COALESCE(t.name_he, '') as team_name_he,
             COALESCE(t.flag_emoji, '') as team_flag,
             COALESCE(t.group_letter, '') as group_letter
      FROM players p
      LEFT JOIN teams t ON t.id = p.team_id
      ORDER BY t.group_letter ASC NULLS LAST, t.name_he ASC, p.name ASC
    `);

    return NextResponse.json({ players: result.rows });
  } catch (error) {
    console.error('Players GET error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
