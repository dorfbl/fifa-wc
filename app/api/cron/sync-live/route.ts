import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calculatePoints } from '@/lib/scoring';

export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find matches that should have started but aren't finished yet
    const matchesResult = await query(`
      SELECT * FROM matches
      WHERE status IN ('scheduled', 'live')
        AND match_date <= NOW()
      ORDER BY match_date ASC
    `);

    const matches = matchesResult.rows;
    if (matches.length === 0) {
      return NextResponse.json({ message: 'No matches to sync', synced: 0 });
    }

    const results: Array<{ matchId: number; apiId: string; status: string; action: string }> = [];

    for (const match of matches) {
      // Extract real TheSportsDB event ID (strip 'TEST-' prefix if present)
      const apiId: string = match.api_id || '';
      const eventId = apiId.startsWith('TEST-') ? apiId.replace('TEST-', '') : apiId;

      if (!eventId) {
        results.push({ matchId: match.id, apiId, status: 'skipped', action: 'no api_id' });
        continue;
      }

      try {
        const response = await fetch(
          `https://www.thesportsdb.com/api/v1/json/${process.env.SPORTSDB_API_KEY}/lookupevent.php?id=${eventId}`
        );
        const data = await response.json();
        const event = data?.events?.[0];

        if (!event) {
          results.push({ matchId: match.id, apiId, status: 'skipped', action: 'no event data' });
          continue;
        }

        const FINISHED_STATUSES = ['Match Finished', 'FT', 'AET', 'AOT', 'AP', 'After Extra Time', 'After Penalties'];
        const LIVE_STATUSES = ['1H', 'HT', '2H', 'ET', 'PT', 'Live'];
        const homeScore = event.intHomeScore !== null && event.intHomeScore !== ''
          ? parseInt(event.intHomeScore)
          : null;
        const awayScore = event.intAwayScore !== null && event.intAwayScore !== ''
          ? parseInt(event.intAwayScore)
          : null;

        // Time-based fallback: group=120min, playoff=170min after kickoff
        const matchAgeMs = Date.now() - new Date(match.match_date).getTime();
        const thresholdMin = match.stage === 'group' ? 120 : 170;
        const overDue = matchAgeMs > thresholdMin * 60 * 1000;

        const isFinished = FINISHED_STATUSES.includes(event.strStatus)
          || (overDue && homeScore !== null && awayScore !== null);
        const isLive = LIVE_STATUSES.includes(event.strStatus);

        if (isFinished && homeScore !== null && awayScore !== null) {
          // Update match as finished with scores
          await query(`
            UPDATE matches SET
              home_score = $1,
              away_score = $2,
              status = 'finished',
              updated_at = NOW()
            WHERE id = $3
          `, [homeScore, awayScore, match.id]);

          // Calculate points for all predictions on this match
          const predsResult = await query(
            'SELECT * FROM predictions WHERE match_id = $1',
            [match.id]
          );

          for (const pred of predsResult.rows) {
            const points = calculatePoints(
              pred.home_score,
              pred.away_score,
              homeScore,
              awayScore,
              pred.is_double
            );
            await query('UPDATE predictions SET points = $1 WHERE id = $2', [points, pred.id]);
          }

          // Handle tournament winner if final
          if (match.stage === 'final') {
            const winnerTeamId = homeScore > awayScore
              ? match.home_team_id
              : match.away_team_id;

            await query(`
              UPDATE tournament_winners SET points = CASE WHEN team_id = $1 THEN 8 ELSE 0 END
            `, [winnerTeamId]);

            await query("UPDATE settings SET value = 'true' WHERE key = 'tournament_ended'");
          }

          // Mark tournament as started
          await query("UPDATE settings SET value = 'true' WHERE key = 'tournament_started'");

          results.push({
            matchId: match.id,
            apiId,
            status: 'finished',
            action: `scored ${homeScore}-${awayScore}, points calculated for ${predsResult.rows.length} predictions`,
          });
        } else if ((isLive || (homeScore !== null && awayScore !== null)) && match.status !== 'live') {
          // Mark as live
          await query(`
            UPDATE matches SET
              home_score = $1,
              away_score = $2,
              status = 'live',
              updated_at = NOW()
            WHERE id = $3
          `, [homeScore, awayScore, match.id]);

          results.push({ matchId: match.id, apiId, status: 'live', action: 'marked live' });
        } else {
          results.push({ matchId: match.id, apiId, status: event.strStatus || 'unknown', action: 'no change' });
        }
      } catch (fetchErr) {
        console.error(`Error fetching event ${eventId}:`, fetchErr);
        results.push({ matchId: match.id, apiId, status: 'error', action: String(fetchErr) });
      }
    }

    return NextResponse.json({ synced: results.length, results });
  } catch (error) {
    console.error('Cron sync error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
