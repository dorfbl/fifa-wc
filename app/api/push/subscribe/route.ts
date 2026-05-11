import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  void req;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { endpoint, keys } = await req.json();
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  await query(`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = $3, auth = $4
  `, [session.id, endpoint, keys.p256dh, keys.auth]);

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  void req;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { endpoint } = await req.json();
  await query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [session.id, endpoint]);

  return NextResponse.json({ success: true });
}
