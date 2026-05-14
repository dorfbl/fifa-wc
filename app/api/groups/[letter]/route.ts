import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(_req: NextRequest, { params }: { params: { letter: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

    const letter = params.letter.toUpperCase();

    const teamsResult = await query(`
      SELECT id, name_he, flag_emoji FROM teams
      WHERE group_letter = $1
      ORDER BY name_he
    `, [letter]);

    const matchesResult = await query(`
      SELECT home_team_id, away_team_id, home_score, away_score
      FROM matches
      WHERE stage = 'group' AND group_letter = $1
        AND status = 'finished'
        AND home_score IS NOT NULL AND away_score IS NOT NULL
    `, [letter]);

    const stats: Record<number, { p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number }> = {};
    const init = (id: number) => {
      if (!stats[id]) stats[id] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    };

    for (const m of matchesResult.rows) {
      const h = m.home_team_id, a = m.away_team_id;
      const hs = m.home_score, as_ = m.away_score;
      init(h); init(a);
      stats[h].p++; stats[a].p++;
      stats[h].gf += hs; stats[h].ga += as_;
      stats[a].gf += as_; stats[a].ga += hs;
      if (hs > as_) { stats[h].w++; stats[h].pts += 3; stats[a].l++; }
      else if (hs < as_) { stats[a].w++; stats[a].pts += 3; stats[h].l++; }
      else { stats[h].d++; stats[h].pts++; stats[a].d++; stats[a].pts++; }
    }

    const teams = teamsResult.rows.map(t => ({
      ...t,
      ...(stats[t.id] || { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }),
    }));

    teams.sort((a, b) => b.pts - a.pts || b.w - a.w || (b.gf - b.ga) - (a.gf - a.ga));

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Group standings error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
