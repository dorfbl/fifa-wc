import { cookies } from 'next/headers';

export interface SessionUser {
  id: number;
  username: string;
  display_name: string;
  is_admin: boolean;
  is_first_login: boolean;
}

const SESSION_COOKIE = 'mundial_session';
const SECRET = process.env.SESSION_SECRET || 'change-me-32-chars-min-secret-key';

function base64url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function fromBase64url(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf8');
}

import crypto from 'crypto';

function sign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSessionToken(user: SessionUser): string {
  const payload = base64url(JSON.stringify(user));
  const sig = sign(payload, SECRET);
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): SessionUser | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = sign(payload, SECRET);
    if (expected !== sig) return null;
    return JSON.parse(fromBase64url(payload)) as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function setSessionCookie(user: SessionUser): string {
  const token = createSessionToken(user);
  return token;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
