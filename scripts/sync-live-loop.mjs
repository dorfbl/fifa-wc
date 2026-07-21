// Polls sync-live every 20 seconds — only live matches are queried, so API quota is minimal
const INTERVAL = 20_000;
const URL = 'http://localhost:3011/api/cron/sync-live';
const SECRET = 'mondial2026-cron-secret-key';

async function sync() {
  try {
    const res = await fetch(URL, { headers: { 'x-cron-secret': SECRET } });
    const data = await res.json();
    if (data.synced > 0) console.log(new Date().toISOString(), JSON.stringify(data));
  } catch (e) {
    console.error(new Date().toISOString(), 'sync error:', e.message);
  }
}

sync();
setInterval(sync, INTERVAL);
