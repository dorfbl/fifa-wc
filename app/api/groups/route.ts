import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

    const teamsResult = await query(`
      SELECT * FROM teams
      WHERE group_letter IS NOT NULL AND group_letter != ''
      ORDER BY group_letter, name_he
    `);

    // Build stats map from finished group matches
    const matchesResult = await query(`
      SELECT home_team_id, away_team_id, home_score, away_score
      FROM matches
      WHERE stage = 'group' AND status = 'finished'
        AND home_score IS NOT NULL AND away_score IS NOT NULL
    `);

    const stats: Record<number, { w: number; d: number; l: number; pts: number }> = {};
    const initStats = (id: number) => {
      if (!stats[id]) stats[id] = { w: 0, d: 0, l: 0, pts: 0 };
    };

    for (const m of matchesResult.rows) {
      const h = m.home_team_id;
      const a = m.away_team_id;
      const hs = m.home_score;
      const as_ = m.away_score;
      initStats(h); initStats(a);
      if (hs > as_) {
        stats[h].w++; stats[h].pts += 3;
        stats[a].l++;
      } else if (hs < as_) {
        stats[a].w++; stats[a].pts += 3;
        stats[h].l++;
      } else {
        stats[h].d++; stats[h].pts++;
        stats[a].d++; stats[a].pts++;
      }
    }

    // Group teams by letter, attach stats, sort by pts desc
    const groups: Record<string, unknown[]> = {};
    for (const team of teamsResult.rows) {
      if (!groups[team.group_letter]) groups[team.group_letter] = [];
      const s = stats[team.id] || { w: 0, d: 0, l: 0, pts: 0 };
      groups[team.group_letter].push({ ...team, ...s });
    }

    // Sort each group by pts desc, then W desc
    type TeamRow = { pts: number; w: number };
    for (const letter of Object.keys(groups)) {
      groups[letter].sort((a: unknown, b: unknown) => {
        const ta = a as TeamRow; const tb = b as TeamRow;
        return tb.pts - ta.pts || tb.w - ta.w;
      });
    }

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Groups error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
