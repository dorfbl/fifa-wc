import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const result = await query('SELECT * FROM teams ORDER BY group_letter, name_he');
    return NextResponse.json({ teams: result.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id, name_he, flag_emoji, group_letter, country_code } = await req.json();
    await query(
      'UPDATE teams SET name_he = $1, flag_emoji = $2, group_letter = $3, country_code = $4 WHERE id = $5',
      [name_he, flag_emoji, group_letter, country_code || null, id]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
