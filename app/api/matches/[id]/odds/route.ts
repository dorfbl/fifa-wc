import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/session';

const API_KEY = process.env.APISPORTS_KEY!;
const BASE = 'https://v3.football.api-sports.io';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

  const matchId = parseInt(params.id);
  const matchRes = await query('SELECT apisports_id FROM matches WHERE id=$1', [matchId]);
  const fixtureId = matchRes.rows[0]?.apisports_id;
  if (!fixtureId) return NextResponse.json({ odds: null });

  try {
    const res = await fetch(`${BASE}/odds?fixture=${fixtureId}`, {
      headers: { 'x-apisports-key': API_KEY },
    });
    const data = await res.json();

    // Find the first bookmaker with a match winner market
    for (const bookmaker of data?.response?.[0]?.bookmakers || []) {
      const market = bookmaker.bets?.find((b: { name: string }) => b.name === 'Match Winner');
      if (!market) continue;

      const home = parseFloat(market.values?.find((v: { value: string }) => v.value === 'Home')?.odd);
      const draw = parseFloat(market.values?.find((v: { value: string }) => v.value === 'Draw')?.odd);
      const away = parseFloat(market.values?.find((v: { value: string }) => v.value === 'Away')?.odd);

      if (!isNaN(home) && !isNaN(draw) && !isNaN(away)) {
        return NextResponse.json({ odds: { home, draw, away } });
      }
    }

    return NextResponse.json({ odds: null });
  } catch {
    return NextResponse.json({ odds: null });
  }
}
