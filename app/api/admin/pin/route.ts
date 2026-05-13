import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

const ADMIN_COOKIE = 'mundial_admin';

export async function GET() {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === 'true';
  return NextResponse.json({ authed });
}

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();
    if (!pin || pin.length !== 4) {
      return NextResponse.json({ error: 'יש להזין 4 ספרות' }, { status: 400 });
    }

    const result = await query("SELECT value FROM settings WHERE key = 'admin_pin_hash'");
    const storedHash = result.rows[0]?.value;

    if (!storedHash) {
      return NextResponse.json({ error: 'מערכת ניהול לא מוגדרת' }, { status: 500 });
    }

    const valid = await bcrypt.compare(pin, storedHash);
    if (!valid) {
      return NextResponse.json({ error: 'סיסמה שגויה' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_COOKIE, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Admin PIN error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
