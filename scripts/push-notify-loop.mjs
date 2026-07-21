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
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch {
      console.error(new Date().toISOString(), 'push bad response:', res.status, text.slice(0, 100));
      return;
    }
    if (data.sent > 0) console.log(new Date().toISOString(), `push sent: ${data.sent}`);
    else if (data.error) console.error(new Date().toISOString(), 'push api error:', data.error);
  } catch (e) {
    console.error(new Date().toISOString(), 'push error:', e.message);
  }
}

notify();
setInterval(notify, INTERVAL);
