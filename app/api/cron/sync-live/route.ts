import { NextRequest, NextResponse } from 'next/server';
import { PoolClient } from 'pg';
import { query, withTransaction } from '@/lib/db';
import { calculatePoints } from '@/lib/scoring';
import { finalizeTournament } from '@/lib/finalizeTournament';

const API_KEY = process.env.APISPORTS_KEY!;
const BASE = 'https://v3.football.api-sports.io';

function apiFetch(path: string) {
  return fetch(`${BASE}${path}`, { headers: { 'x-apisports-key': API_KEY } })
    .then(r => r.json());
}

function getApiError(data: { errors?: unknown }) {
  const errors = data?.errors;
  if (!errors) return null;
  if (Array.isArray(errors)) return errors.length ? errors.join(', ') : null;
  if (typeof errors === 'object') {
    const values = Object.values(errors as Record<string, unknown>).filter(Boolean);
    return values.length ? values.join(', ') : null;
  }
  return String(errors);
}

const FINISHED = ['FT', 'AET', 'PEN', 'AWD', 'WO'];
const LIVE = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT'];

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Only poll matches that are already live, plus a 10-minute kickoff window
    // for scheduled matches (to detect when they go live). Never poll upcoming or
    // already-finished matches to conserve API quota.
    const matchesResult = await query(`
      SELECT m.*,
        ht.api_id as home_api_id, at.api_id as away_api_id
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE (
        m.status = 'live'
        OR (m.status = 'scheduled' AND m.match_date <= NOW() AND m.match_date > NOW() - INTERVAL '60 minutes')
      )
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
        const apiError = getApiError(data);
        if (apiError) {
          results.push({ matchId: match.id, action: `api error: ${apiError}` });
          continue;
        }
        const f = data?.response?.[0];
        if (!f) {
          results.push({ matchId: match.id, action: 'no data' });
          continue;
        }

        const statusShort = f.fixture.status?.short || 'NS';
        const elapsed = f.fixture.status?.elapsed || null;
        const homeScore = f.goals?.home ?? null;
        const awayScore = f.goals?.away ?? null;
        // 90-min score (used for prediction scoring in knockout matches)
        const score90Home = f.score?.fulltime?.home ?? null;
        const score90Away = f.score?.fulltime?.away ?? null;
        const penHome = f.score?.penalty?.home ?? null;
        const penAway = f.score?.penalty?.away ?? null;
        // Only store 90-min score separately when the match went to ET/PEN
        const wentExtra = ['AET', 'PEN'].includes(statusShort);

        const isFinished = FINISHED.includes(statusShort);
        const isLive = LIVE.includes(statusShort);

        // Time-based fallback
        const matchAgeMs = Date.now() - new Date(match.match_date).getTime();
        const thresholdMin = match.stage === 'group' ? 120 : 170;
        const overDue = matchAgeMs > thresholdMin * 60 * 1000;
        // Never time-finalize while the provider says the match is live. This is
        // especially important during ET: `goals` contains the running 120-minute
        // score while `score.fulltime` contains the prediction result at 90 minutes.
        const forceFinish = overDue && !isLive && homeScore !== null && awayScore !== null;

        if ((isFinished || forceFinish) && homeScore !== null && awayScore !== null) {
          // Skip only if already finished with same score AND events count matches
          const scoreUnchanged = match.status === 'finished'
            && match.home_score === homeScore && match.away_score === awayScore
            && match.pen_home === penHome && match.pen_away === penAway
            && match.score_90_home === (wentExtra ? score90Home : null)
            && match.score_90_away === (wentExtra ? score90Away : null);
          const apiEventCount = (f.events || []).length;
          const { rows: dbEventRows } = await query('SELECT COUNT(*)::int as cnt FROM match_events WHERE match_id=$1', [match.id]);
          const dbEventCount = dbEventRows[0]?.cnt ?? 0;
          if (scoreUnchanged && dbEventCount === apiEventCount) {
            results.push({ matchId: match.id, action: 'no change' });
            continue;
          }

          let predictionCount = 0;
          await withTransaction(async client => {
            await client.query(`
              UPDATE matches SET
                home_score=$1, away_score=$2, status='finished', elapsed=NULL,
                score_90_home=$4, score_90_away=$5,
                pen_home=$6, pen_away=$7,
                updated_at=NOW()
              WHERE id=$3
            `, [homeScore, awayScore, match.id,
                wentExtra ? score90Home : null,
                wentExtra ? score90Away : null,
                penHome, penAway]);

            // Events, points and the finalization marker commit together.
            await syncEvents(match.id, f.events || [], client);
            const preds = await client.query('SELECT * FROM predictions WHERE match_id=$1', [match.id]);
            predictionCount = preds.rows.length;
            for (const pred of preds.rows) {
              const pts = calculatePoints(
                pred.home_score, pred.away_score, homeScore, awayScore,
                pred.is_double, match.stage,
                wentExtra ? score90Home : null, wentExtra ? score90Away : null
              );
              await client.query('UPDATE predictions SET points=$1 WHERE id=$2', [pts, pred.id]);
            }

            if (match.stage === 'final') {
              await finalizeTournament(client, {
                id: match.id,
                home_team_id: match.home_team_id,
                away_team_id: match.away_team_id,
                home_score: homeScore,
                away_score: awayScore,
                pen_home: penHome,
                pen_away: penAway,
              });
            } else {
              await client.query(`
                UPDATE top_scorer_picks tsp
                SET points = COALESCE((
                  SELECT COUNT(*)::int FROM match_events me
                  JOIN players pl ON pl.api_id = me.player_api_id
                  WHERE pl.id = tsp.player_id
                    AND me.event_type = 'goal'
                    AND me.detail NOT ILIKE '%own%'
                ), 0)
              `);
            }
            await client.query("UPDATE settings SET value='true' WHERE key='tournament_started'");
          });

          results.push({ matchId: match.id, action: `finished ${homeScore}-${awayScore}, ${predictionCount} predictions scored` });

        } else if (isLive || forceFinish) {
          const scoreChanged = homeScore !== match.home_score || awayScore !== match.away_score;
          if (scoreChanged || match.status !== 'live' || elapsed !== match.elapsed) {
            await query(`
              UPDATE matches SET home_score=$1, away_score=$2, status='live', elapsed=$3, updated_at=NOW()
              WHERE id=$4
            `, [homeScore, awayScore, elapsed, match.id]);

            await syncEvents(match.id, f.events || []);
            if (match.stage === 'final') {
              await query("UPDATE settings SET value='false' WHERE key='tournament_ended'");
            }
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
    player: { id: number | null; name: string };
    assist: { name: string | null };
  }>,
  client?: PoolClient,
) {
  const db = client ?? { query };
  // Build a set of canonical keys for events coming from the API
  // Key: elapsed|event_type|player_name  (same as the DB unique constraint)
  const apiKeys = new Set<string>();

  for (const ev of events) {
    if (!ev.type || !ev.player?.name) continue;
    if (ev.detail === 'Missed Penalty') continue;

    const elapsed = ev.time?.elapsed || 0;
    const eventType = ev.type.toLowerCase();
    const playerName = ev.player.name;
    apiKeys.add(`${elapsed}|${eventType}|${playerName}`);

    // Find team db id
    const teamApiId = String(ev.team?.id);
    const teamRes = await db.query('SELECT id FROM teams WHERE api_id=$1', [teamApiId]);
    const teamId = teamRes.rows[0]?.id || null;

    await db.query(`
      INSERT INTO match_events (match_id, elapsed, elapsed_extra, event_type, detail, team_id, player_name, assist_name, player_api_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (match_id, elapsed, COALESCE(elapsed_extra, -1), event_type, player_name) DO UPDATE SET
        detail = $5,
        assist_name = $8,
        player_api_id = COALESCE($9, match_events.player_api_id)
    `, [
      matchId,
      elapsed,
      ev.time?.extra || null,
      eventType,
      ev.detail || '',
      teamId,
      playerName,
      ev.assist?.name || null,
      ev.player?.id || null,
    ]);
  }

  // Remove DB events that no longer exist in the API response
  // (VAR-canceled goals, rescinded red cards, etc.)
  const dbEvents = await db.query(
    'SELECT id, elapsed, event_type, player_name FROM match_events WHERE match_id=$1',
    [matchId]
  );
  for (const row of dbEvents.rows) {
    const key = `${row.elapsed}|${row.event_type}|${row.player_name}`;
    if (!apiKeys.has(key)) {
      await db.query('DELETE FROM match_events WHERE id=$1', [row.id]);
    }
  }
}
