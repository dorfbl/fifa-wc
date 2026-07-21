import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const result = await query(
      'SELECT id, username, display_name, is_admin, is_first_login, created_at FROM users ORDER BY created_at'
    );
    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { username, displayName, pin } = await req.json();
    if (!username || !displayName || !pin || pin.length !== 4) {
      return NextResponse.json({ error: 'נתונים חסרים' }, { status: 400 });
    }

    const hash = await bcrypt.hash(pin, 10);
    const result = await query(
      'INSERT INTO users (username, display_name, pin_hash, is_first_login) VALUES ($1, $2, $3, TRUE) RETURNING id',
      [username.toLowerCase().trim(), displayName.trim(), hash]
    );

    return NextResponse.json({ success: true, id: result.rows[0].id });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'שם משתמש כבר קיים' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id, pin } = await req.json();
    if (!id || !pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN חייב להיות 4 ספרות' }, { status: 400 });
    }

    const hash = await bcrypt.hash(pin, 10);
    await query(
      'UPDATE users SET pin_hash = $1, is_first_login = TRUE WHERE id = $2',
      [hash, id]
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
    await query('DELETE FROM users WHERE id = $1 AND is_admin = FALSE', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
