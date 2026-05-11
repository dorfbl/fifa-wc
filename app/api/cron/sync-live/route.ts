import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calculatePoints } from '@/lib/scoring';

const API_KEY = process.env.APISPORTS_KEY!;
const BASE = 'https://v3.football.api-sports.io';

function apiFetch(path: string) {
  return fetch(`${BASE}${path}`, { headers: { 'x-apisports-key': API_KEY } })
    .then(r => r.json());
}

const FINISHED = ['FT', 'AET', 'PEN', 'AWD', 'WO'];
const LIVE = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT'];

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find matches that should have started
    const matchesResult = await query(`
      SELECT m.*,
        ht.api_id as home_api_id, at.api_id as away_api_id
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE m.status IN ('scheduled', 'live')
        AND m.match_date <= NOW()
      ORDER BY m.match_date ASC
    `);

    const matches = matchesResult.rows;
    if (matches.length === 0) {
      return NextResponse.json({ message: 'No matches to sync', synced: 0 });
    }

    const results = [];

    for (const match of matches) {
      // Use apisports_id if available, otherwise try api_id (strip TEST- prefix)
      const fixtureId = match.apisports_id
        || (match.api_id?.startsWith('TEST-') ? match.api_id.replace('TEST-', '') : match.api_id);

      if (!fixtureId) {
        results.push({ matchId: match.id, action: 'no fixture id' });
        continue;
      }

      try {
        const data = await apiFetch(`/fixtures?id=${fixtureId}`);
        const f = data?.response?.[0];
        if (!f) {
          results.push({ matchId: match.id, action: 'no data' });
          continue;
        }

        const statusShort = f.fixture.status?.short || 'NS';
        const elapsed = f.fixture.status?.elapsed || null;
        const homeScore = f.goals?.home ?? null;
        const awayScore = f.goals?.away ?? null;

        const isFinished = FINISHED.includes(statusShort);
        const isLive = LIVE.includes(statusShort);

        // Time-based fallback
        const matchAgeMs = Date.now() - new Date(match.match_date).getTime();
        const thresholdMin = match.stage === 'group' ? 120 : 170;
        const overDue = matchAgeMs > thresholdMin * 60 * 1000;
        const forceFinish = overDue && homeScore !== null && awayScore !== null;

        if ((isFinished || forceFinish) && homeScore !== null && awayScore !== null) {
          await query(`
            UPDATE matches SET home_score=$1, away_score=$2, status='finished', elapsed=NULL, updated_at=NOW()
            WHERE id=$3
          `, [homeScore, awayScore, match.id]);

          // Sync events before calculating points
          await syncEvents(match.id, f.events || []);

          // Calculate points
          const preds = await query('SELECT * FROM predictions WHERE match_id=$1', [match.id]);
          for (const pred of preds.rows) {
            const pts = calculatePoints(pred.home_score, pred.away_score, homeScore, awayScore, pred.is_double);
            await query('UPDATE predictions SET points=$1 WHERE id=$2', [pts, pred.id]);
          }

          if (match.stage === 'final') {
            const winnerTeamId = homeScore > awayScore ? match.home_team_id : match.away_team_id;
            await query(`UPDATE tournament_winners SET points = CASE WHEN team_id=$1 THEN 8 ELSE 0 END`, [winnerTeamId]);
            await query(`UPDATE settings SET value='true' WHERE key='tournament_ended'`);
          }
          await query(`UPDATE settings SET value='true' WHERE key='tournament_started'`);

          results.push({ matchId: match.id, action: `finished ${homeScore}-${awayScore}, ${preds.rows.length} predictions scored` });

        } else if (isLive || forceFinish) {
          const scoreChanged = homeScore !== match.home_score || awayScore !== match.away_score;
          if (scoreChanged || match.status !== 'live' || elapsed !== match.elapsed) {
            await query(`
              UPDATE matches SET home_score=$1, away_score=$2, status='live', elapsed=$3, updated_at=NOW()
              WHERE id=$4
            `, [homeScore, awayScore, elapsed, match.id]);

            await syncEvents(match.id, f.events || []);
            await query(`UPDATE settings SET value='true' WHERE key='tournament_started'`);

            results.push({ matchId: match.id, action: `live ${homeScore}-${awayScore} (${elapsed}')` });
          } else {
            results.push({ matchId: match.id, action: 'no change' });
          }
        } else {
          results.push({ matchId: match.id, action: 'no change', status: statusShort });
        }
      } catch (err) {
        results.push({ matchId: match.id, action: `error: ${err}` });
      }
    }

    return NextResponse.json({ synced: results.length, results });
  } catch (error) {
    console.error('Cron sync error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}

async function syncEvents(
  matchId: number,
  events: Array<{
    time: { elapsed: number; extra: number | null };
    type: string;
    detail: string;
    team: { id: number };
    player: { name: string };
    assist: { name: string | null };
  }>
) {
  for (const ev of events) {
    if (!ev.type || !ev.player?.name) continue;

    // Find team db id
    const teamApiId = String(ev.team?.id);
    const teamRes = await query('SELECT id FROM teams WHERE api_id=$1', [teamApiId]);
    const teamId = teamRes.rows[0]?.id || null;

    await query(`
      INSERT INTO match_events (match_id, elapsed, elapsed_extra, event_type, detail, team_id, player_name, assist_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (match_id, elapsed, event_type, player_name) DO UPDATE SET
        detail = $5,
        elapsed_extra = $3,
        assist_name = $8
    `, [
      matchId,
      ev.time?.elapsed || 0,
      ev.time?.extra || null,
      ev.type.toLowerCase(),
      ev.detail || '',
      teamId,
      ev.player?.name || '',
      ev.assist?.name || null,
    ]);
  }
}
