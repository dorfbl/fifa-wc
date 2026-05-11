import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const result = await query('SELECT * FROM channels ORDER BY name_he');
    return NextResponse.json({ channels: result.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { name_he, logo_url } = await req.json();
    if (!name_he) return NextResponse.json({ error: 'שם הערוץ נדרש' }, { status: 400 });

    const result = await query(
      'INSERT INTO channels (name_he, logo_url) VALUES ($1, $2) RETURNING *',
      [name_he, logo_url || null]
    );
    return NextResponse.json({ success: true, channel: result.rows[0] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id, name_he, logo_url } = await req.json();
    await query(
      'UPDATE channels SET name_he = $1, logo_url = $2 WHERE id = $3',
      [name_he, logo_url || null, id]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await req.json();
    await query('DELETE FROM channels WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
