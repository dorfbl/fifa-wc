// Polls push-notify every 10 minutes
const INTERVAL = 10 * 60 * 1000;
const URL = 'http://localhost:3011/api/cron/push-notify';
const SECRET = 'mondial2026-cron-secret-key';

async function notify() {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'x-cron-secret': SECRET },
    });
    const data = await res.json();
    if (data.sent > 0) console.log(new Date().toISOString(), `push sent: ${data.sent}`);
  } catch (e) {
    console.error(new Date().toISOString(), 'push error:', e.message);
  }
}

notify();
setInterval(notify, INTERVAL);
