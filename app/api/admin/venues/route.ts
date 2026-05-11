import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const result = await query('SELECT * FROM venues ORDER BY city_he');
    return NextResponse.json({ venues: result.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id, name_he, city_he, country_he } = await req.json();
    await query(
      'UPDATE venues SET name_he = $1, city_he = $2, country_he = $3 WHERE id = $4',
      [name_he, city_he, country_he, id]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
