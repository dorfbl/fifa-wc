import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { SessionUser, createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const { username, pin } = await req.json();

    if (!username || !pin || pin.length !== 4) {
      return NextResponse.json({ error: 'שם משתמש וסיסמה נדרשים' }, { status: 400 });
    }

    const result = await query(
      'SELECT id, username, display_name, pin_hash, is_admin, is_first_login FROM users WHERE username = $1',
      [username.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'שם משתמש או סיסמה שגויים' }, { status: 401 });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(pin, user.pin_hash);

    if (!valid) {
      return NextResponse.json({ error: 'שם משתמש או סיסמה שגויים' }, { status: 401 });
    }

    const sessionUser: SessionUser = {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      is_admin: user.is_admin,
      is_first_login: user.is_first_login,
    };

    const token = createSessionToken(sessionUser);

    const response = NextResponse.json({
      success: true,
      user: sessionUser,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
