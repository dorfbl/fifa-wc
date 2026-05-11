import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function requireAdmin() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get('mundial_admin')?.value;
  if (adminCookie !== 'true') {
    return NextResponse.json({ error: 'גישה נדחתה' }, { status: 403 });
  }
  return null;
}
