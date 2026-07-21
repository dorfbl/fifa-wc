import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/session';

const STAGE_ORDER = ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

  const res = await query(`
    SELECT
      m.id, m.stage, m.status, m.home_score, m.away_score, m.score_90_home, m.score_90_away, m.pen_home, m.pen_away, m.match_date,
      ht.name_he  AS home_name, ht.flag_emoji AS home_flag,
      at.name_he  AS away_name, at.flag_emoji AS away_flag,
      v.name_he   AS venue_name, v.city_he AS venue_city,
      ch.name_he  AS channel_name, ch.logo_url AS channel_logo
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    LEFT JOIN venues v ON v.id = m.venue_id
    LEFT JOIN channels ch ON ch.id = m.channel_id
    WHERE m.stage != 'group'
    ORDER BY m.match_date ASC
  `);

  const rounds: Record<string, unknown[]> = {};
  for (const stage of STAGE_ORDER) rounds[stage] = [];

  for (const row of res.rows) {
    if (rounds[row.stage]) rounds[row.stage].push(row);
  }

  // Drop empty rounds
  const filtered: Record<string, unknown[]> = {};
  for (const stage of STAGE_ORDER) {
    if (rounds[stage].length > 0) filtered[stage] = rounds[stage];
  }

  // Top scorers
  const scorersRes = await query(`
    SELECT
      pl.name, pl.photo_url,
      t.name_he  AS team_name,
      t.flag_emoji AS team_flag,
      COUNT(*) AS goals
    FROM match_events me
    JOIN players pl ON pl.api_id = me.player_api_id
    JOIN teams t ON t.id = me.team_id
    WHERE me.event_type = 'goal'
      AND me.detail NOT ILIKE '%own%'
      AND me.detail NOT ILIKE '%missed%'
    GROUP BY pl.id, pl.name, pl.photo_url, t.name_he, t.flag_emoji
    ORDER BY goals DESC
    LIMIT 5
  `);

  return NextResponse.json({ rounds: filtered, topScorers: scorersRes.rows });
}
