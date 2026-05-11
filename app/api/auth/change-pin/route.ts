import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { getSession, createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

    const { newPin } = await req.json();
    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return NextResponse.json({ error: 'יש להזין 4 ספרות' }, { status: 400 });
    }

    const hash = await bcrypt.hash(newPin, 10);
    await query(
      'UPDATE users SET pin_hash = $1, is_first_login = FALSE WHERE id = $2',
      [hash, session.id]
    );

    const updatedSession = { ...session, is_first_login: false };
    const token = createSessionToken(updatedSession);

    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Change PIN error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
