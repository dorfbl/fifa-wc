import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';
import { calculatePoints } from '@/lib/scoring';

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

    await query(`
      UPDATE matches SET
        match_date = COALESCE($1, match_date),
        channel_id = $2,
        home_score = $3,
        away_score = $4,
        status = COALESCE($5, status),
        venue_id = $6,
        updated_at = NOW()
      WHERE id = $7
    `, [match_date, channel_id, home_score, away_score, status, venue_id, id]);

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

    const matchResult = await query('SELECT * FROM matches WHERE id = $1', [matchId]);
    const match = matchResult.rows[0];

    if (!match || match.home_score === null || match.away_score === null) {
      return NextResponse.json({ error: 'תוצאה לא מוגדרת' }, { status: 400 });
    }

    const predsResult = await query('SELECT * FROM predictions WHERE match_id = $1', [matchId]);

    for (const pred of predsResult.rows) {
      const points = calculatePoints(
        pred.home_score,
        pred.away_score,
        match.home_score,
        match.away_score,
        pred.is_double
      );
      await query('UPDATE predictions SET points = $1 WHERE id = $2', [points, pred.id]);
    }

    // Recalculate tournament winner points
    const tournamentEnded = match.stage === 'final' && match.status === 'finished';
    if (tournamentEnded) {
      const winnerTeamId = match.home_score > match.away_score
        ? match.home_team_id
        : match.away_team_id;

      await query(`
        UPDATE tournament_winners SET points = CASE WHEN team_id = $1 THEN 8 ELSE 0 END
      `, [winnerTeamId]);

      await query("UPDATE settings SET value = 'true' WHERE key = 'tournament_ended'");
    }

    // Mark tournament as started if it's the first match
    await query("UPDATE settings SET value = 'true' WHERE key = 'tournament_started'");

    return NextResponse.json({ success: true, updated: predsResult.rows.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
