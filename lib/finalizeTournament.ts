import { PoolClient } from 'pg';

export interface FinalMatchResult {
  id: number;
  home_team_id: number;
  away_team_id: number;
  home_score: number;
  away_score: number;
  pen_home?: number | null;
  pen_away?: number | null;
}

export function getFinalWinnerTeamId(match: FinalMatchResult): number {
  if (match.home_score > match.away_score) return match.home_team_id;
  if (match.away_score > match.home_score) return match.away_team_id;
  if (match.pen_home != null && match.pen_away != null) {
    if (match.pen_home > match.pen_away) return match.home_team_id;
    if (match.pen_away > match.pen_home) return match.away_team_id;
  }
  throw new Error('Final winner cannot be determined from the recorded score');
}

/** Must run inside the same transaction that finishes and scores the final. */
export async function finalizeTournament(client: PoolClient, match: FinalMatchResult): Promise<void> {
  const winnerTeamId = getFinalWinnerTeamId(match);

  await client.query(
    'UPDATE tournament_winners SET points = CASE WHEN team_id=$1 THEN 8 ELSE 0 END',
    [winnerTeamId],
  );

  // Rebuild goal points for every pick so retries are idempotent.
  await client.query(`
    UPDATE top_scorer_picks tsp
    SET points = COALESCE((
      SELECT COUNT(*)::int
      FROM match_events me
      JOIN players pl ON pl.api_id = me.player_api_id
      WHERE pl.id = tsp.player_id
        AND me.event_type = 'goal'
        AND me.detail NOT ILIKE '%own%'
    ), 0)
  `);

  // All players tied for the most goals receive the top-scorer bonus.
  await client.query(`
    WITH goal_totals AS (
      SELECT player_api_id, COUNT(*)::int AS goals
      FROM match_events
      WHERE event_type = 'goal'
        AND detail NOT ILIKE '%own%'
        AND player_api_id IS NOT NULL
      GROUP BY player_api_id
    ), leaders AS (
      SELECT player_api_id FROM goal_totals
      WHERE goals = (SELECT MAX(goals) FROM goal_totals)
    )
    UPDATE top_scorer_picks tsp
    SET points = tsp.points + 8
    FROM players pl
    WHERE pl.id = tsp.player_id
      AND pl.api_id IN (SELECT player_api_id FROM leaders)
  `);

  const incomplete = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM predictions WHERE match_id=$1 AND points IS NULL)::int AS predictions,
      (SELECT COUNT(*) FROM tournament_winners WHERE points IS NULL)::int AS winners,
      (SELECT COUNT(*) FROM top_scorer_picks WHERE points IS NULL)::int AS scorers
  `, [match.id]);
  const pending = incomplete.rows[0];
  if (pending.predictions || pending.winners || pending.scorers) {
    throw new Error('Tournament finalization completeness check failed');
  }

  // This marker is deliberately last: it is the visibility gate for final results.
  await client.query("UPDATE settings SET value='true' WHERE key='tournament_ended'");
}
