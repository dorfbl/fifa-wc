import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';
import { calculatePoints } from '@/lib/scoring';
import { finalizeTournament } from '@/lib/finalizeTournament';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const result = await query(`
      SELECT
        m.*,
        ht.name_he as home_name_he, ht.flag_emoji as home_flag,
        at.name_he as away_name_he, at.flag_emoji as away_flag,
        v.name_he as venue_name, ch.name_he as channel_name, ch.logo_url as channel_logo
      FROM matches m
      LEFT JOIN teams ht ON m.home_team_id = ht.id
      LEFT JOIN teams at ON m.away_team_id = at.id
      LEFT JOIN venues v ON m.venue_id = v.id
      LEFT JOIN channels ch ON m.channel_id = ch.id
      ORDER BY m.match_date ASC
    `);
    return NextResponse.json({ matches: result.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id, match_date, channel_id, home_score, away_score, status, venue_id } = await req.json();

    const updated = await query(`
      UPDATE matches SET
        match_date = COALESCE($1, match_date),
        channel_id = $2,
        home_score = $3,
        away_score = $4,
        status = COALESCE($5, status),
        venue_id = $6,
        updated_at = NOW()
      WHERE id = $7
      RETURNING stage, status
    `, [match_date, channel_id, home_score, away_score, status, venue_id, id]);

    if (updated.rows[0]?.stage === 'final' && updated.rows[0]?.status !== 'finished') {
      await query("UPDATE settings SET value='false' WHERE key='tournament_ended'");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}

// Recalculate points for a match
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { matchId } = await req.json();

    const updated = await withTransaction(async client => {
      const matchResult = await client.query('SELECT * FROM matches WHERE id = $1 FOR UPDATE', [matchId]);
      const match = matchResult.rows[0];
      if (!match || match.home_score === null || match.away_score === null) {
        throw new Error('RESULT_NOT_DEFINED');
      }

      const predsResult = await client.query('SELECT * FROM predictions WHERE match_id = $1', [matchId]);
      for (const pred of predsResult.rows) {
        const points = calculatePoints(
          pred.home_score,
          pred.away_score,
          match.home_score,
          match.away_score,
          pred.is_double,
          match.stage,
          match.score_90_home,
          match.score_90_away
        );
        await client.query('UPDATE predictions SET points = $1 WHERE id = $2', [points, pred.id]);
      }

      if (match.stage === 'final' && match.status === 'finished') {
        await finalizeTournament(client, match);
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
      return predsResult.rows.length;
    });

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'RESULT_NOT_DEFINED') {
      return NextResponse.json({ error: 'תוצאה לא מוגדרת' }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { matchId } = await req.json();

    // Get the team IDs before deleting
    const matchRes = await query('SELECT home_team_id, away_team_id FROM matches WHERE id = $1', [matchId]);
    if (!matchRes.rows[0]) return NextResponse.json({ error: 'משחק לא נמצא' }, { status: 404 });

    const { home_team_id, away_team_id } = matchRes.rows[0];

    // Delete the match (cascades predictions + match_events)
    await query('DELETE FROM matches WHERE id = $1', [matchId]);

    // Delete teams that are no longer used by any other match
    for (const teamId of [home_team_id, away_team_id]) {
      const usedRes = await query(
        'SELECT 1 FROM matches WHERE home_team_id = $1 OR away_team_id = $1 LIMIT 1',
        [teamId]
      );
      if (usedRes.rows.length === 0) {
        await query('DELETE FROM players WHERE team_id = $1', [teamId]);
        await query('DELETE FROM tournament_winners WHERE team_id = $1', [teamId]);
        await query('DELETE FROM teams WHERE id = $1', [teamId]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
