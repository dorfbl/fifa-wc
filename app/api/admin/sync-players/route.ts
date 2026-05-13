import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';

const API_KEY = process.env.APISPORTS_KEY!;
const BASE = 'https://v3.football.api-sports.io';

function apiFetch(path: string) {
  return fetch(`${BASE}${path}`, { headers: { 'x-apisports-key': API_KEY } })
    .then(r => r.json());
}

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    // Get all teams with api_id from DB
    const teamsResult = await query('SELECT id, api_id, name_en FROM teams WHERE api_id IS NOT NULL');
    const teams = teamsResult.rows;

    let totalPlayers = 0;

    for (const team of teams) {
      try {
        const data = await apiFetch(`/players/squads?team=${team.api_id}`);
        const players: Array<{ id: number; name: string; photo: string }> =
          data?.response?.[0]?.players || [];

        for (const player of players) {
          if (!player.id || !player.name) continue;
          await query(`
            INSERT INTO players (api_id, name, photo_url, team_id)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (api_id) DO UPDATE SET
              name = $2, photo_url = $3, team_id = $4
          `, [player.id, player.name, player.photo || null, team.id]);
          totalPlayers++;
        }
      } catch (err) {
        console.error(`Squad fetch error for team ${team.api_id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      teams: teams.length,
      players: totalPlayers,
      message: `סונכרנו ${totalPlayers} שחקנים מ-${teams.length} קבוצות`,
    });
  } catch (error) {
    console.error('Sync players error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
