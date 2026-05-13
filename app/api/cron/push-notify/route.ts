import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find matches starting in 50–70 minutes that are still scheduled and not yet notified
  const matchesResult = await query(`
    SELECT m.id, m.match_date,
      ht.name_he as home_name, at.name_he as away_name
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    WHERE m.status = 'scheduled'
      AND m.push_sent_at IS NULL
      AND m.match_date BETWEEN NOW() + INTERVAL '20 minutes' AND NOW() + INTERVAL '40 minutes'
  `);

  if (matchesResult.rows.length === 0) {
    return NextResponse.json({ message: 'No upcoming matches', sent: 0 });
  }

  let totalSent = 0;

  for (const match of matchesResult.rows) {
    // Mark as notified immediately to prevent duplicate sends
    await query('UPDATE matches SET push_sent_at = NOW() WHERE id = $1', [match.id]);

    // Find subscribed users who have NOT predicted this match
    const subsResult = await query(`
      SELECT ps.user_id, ps.endpoint, ps.p256dh, ps.auth
      FROM push_subscriptions ps
      WHERE ps.user_id NOT IN (
        SELECT p.user_id FROM predictions p WHERE p.match_id = $1
      )
    `, [match.id]);

    const title = '⏰ שעה לקיקאוף!';
    const body = `${match.home_name} נגד ${match.away_name} – עוד לא הגשת תחזית`;
    const url = `/matches/${match.id}`;

    for (const sub of subsResult.rows) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, tag: `match-${match.id}`, url })
        );
        totalSent++;
      } catch (err: unknown) {
        // Remove expired/invalid subscriptions
        if ((err as { statusCode?: number }).statusCode === 410 || (err as { statusCode?: number }).statusCode === 404) {
          await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
        }
      }
    }
  }

  return NextResponse.json({ sent: totalSent, matches: matchesResult.rows.length });
}
