import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/session';

const API_KEY = process.env.APISPORTS_KEY!;
const BASE = 'https://v3.football.api-sports.io';

interface InjuryPlayer {
  name: string;
  photo: string | null;
  reason: string;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

  const matchId = parseInt(params.id);
  const matchRes = await query(
    `SELECT m.apisports_id, ht.api_id as home_api_id, at.api_id as away_api_id
     FROM matches m
     JOIN teams ht ON m.home_team_id = ht.id
     JOIN teams at ON m.away_team_id = at.id
     WHERE m.id=$1`,
    [matchId]
  );
  const row = matchRes.rows[0];
  if (!row?.apisports_id) return NextResponse.json({ home: [], away: [] });

  try {
    const res = await fetch(`${BASE}/injuries?fixture=${row.apisports_id}`, {
      headers: { 'x-apisports-key': API_KEY },
    });
    const data = await res.json();

    const homeSeen = new Set<string>();
    const awaySeen = new Set<string>();
    const home: InjuryPlayer[] = [];
    const away: InjuryPlayer[] = [];

    for (const item of data?.response || []) {
      const key = String(item.player?.id || item.player?.name || '');
      if (!key) continue;
      const player: InjuryPlayer = {
        name: item.player?.name || '',
        photo: item.player?.photo || null,
        reason: item.player?.reason || item.player?.type || '',
      };
      const teamApiId = String(item.team?.id);
      if (teamApiId === String(row.home_api_id) && !homeSeen.has(key)) {
        homeSeen.add(key);
        home.push(player);
      } else if (teamApiId === String(row.away_api_id) && !awaySeen.has(key)) {
        awaySeen.add(key);
        away.push(player);
      }
    }

    return NextResponse.json({ home, away });
  } catch {
    return NextResponse.json({ home: [], away: [] });
  }
}
