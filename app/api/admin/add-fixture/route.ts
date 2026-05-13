import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';

const API_KEY = process.env.APISPORTS_KEY!;
const BASE = 'https://v3.football.api-sports.io';

function apiFetch(path: string) {
  return fetch(`${BASE}${path}`, { headers: { 'x-apisports-key': API_KEY } })
    .then(r => r.json());
}

const HEBREW_NAMES: Record<string, string> = {
  'Mexico': 'מקסיקו', 'South Africa': 'דרום אפריקה', 'South Korea': 'קוריאה הדרומית',
  'Czech Republic': "צ'כיה", 'Czechia': "צ'כיה", 'Canada': 'קנדה',
  'Bosnia & Herzegovina': 'בוסניה והרצגובינה', 'USA': 'ארצות הברית',
  'United States': 'ארצות הברית', 'Paraguay': 'פרגוואי',
  'Brazil': 'ברזיל', 'Morocco': 'מרוקו', 'Qatar': 'קטאר',
  'Switzerland': 'שוויץ', 'Haiti': 'האיטי', 'Scotland': 'סקוטלנד',
  'Germany': 'גרמניה', 'Curacao': 'קוראסאו',
  'Ivory Coast': 'חוף השנהב', "Cote d'Ivoire": 'חוף השנהב',
  'Ecuador': 'אקוודור', 'Netherlands': 'הולנד', 'Japan': 'יפן',
  'Australia': 'אוסטרליה', 'Turkey': 'טורקיה',
  'Belgium': 'בלגיה', 'Egypt': 'מצרים', 'Saudi Arabia': 'ערב הסעודית',
  'Uruguay': 'אורוגוואי', 'Spain': 'ספרד', 'Cape Verde': 'כף ורדה',
  'Sweden': 'שוודיה', 'Tunisia': 'תוניסיה', 'Argentina': 'ארגנטינה',
  'France': 'צרפת', 'England': 'אנגליה', 'Portugal': 'פורטוגל',
  'Italy': 'איטליה', 'Croatia': 'קרואטיה', 'Denmark': 'דנמרק',
  'Colombia': 'קולומביה', 'Chile': "צ'ילה", 'Peru': 'פרו',
  'Senegal': 'סנגל', 'Ghana': 'גאנה', 'Cameroon': 'קמרון',
  'Nigeria': 'ניגריה', 'Poland': 'פולין', 'Serbia': 'סרביה',
  'Ukraine': 'אוקראינה', 'Austria': 'אוסטריה', 'Hungary': 'הונגריה',
  'Iran': 'איראן', 'Indonesia': 'אינדונזיה', 'New Zealand': 'ניו זילנד',
  'Honduras': 'הונדורס', 'Panama': 'פנמה', 'Venezuela': 'ונצואלה',
  'Norway': 'נורבגיה', 'Slovakia': 'סלובקיה', 'Romania': 'רומניה',
  'Greece': 'יוון', 'Kuwait': 'כווית', 'Iraq': 'עיראק',
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const COUNTRY_CODES: Record<string, string> = {
  'Mexico': 'MX', 'South Africa': 'ZA', 'South Korea': 'KR', 'Czech Republic': 'CZ',
  'Czechia': 'CZ', 'Canada': 'CA', 'Bosnia & Herzegovina': 'BA', 'USA': 'US',
  'United States': 'US', 'Paraguay': 'PY', 'Brazil': 'BR', 'Morocco': 'MA',
  'Qatar': 'QA', 'Switzerland': 'CH', 'Haiti': 'HT', 'Scotland': 'GB-SCT',
  'Germany': 'DE', 'Curacao': 'CW', 'Ivory Coast': 'CI', "Cote d'Ivoire": 'CI',
  'Ecuador': 'EC', 'Netherlands': 'NL', 'Japan': 'JP', 'Australia': 'AU',
  'Turkey': 'TR', 'Belgium': 'BE', 'Egypt': 'EG', 'Saudi Arabia': 'SA',
  'Uruguay': 'UY', 'Spain': 'ES', 'Cape Verde': 'CV', 'Sweden': 'SE',
  'Tunisia': 'TN', 'Argentina': 'AR', 'France': 'FR', 'England': 'GB-ENG',
  'Portugal': 'PT', 'Italy': 'IT', 'Croatia': 'HR', 'Denmark': 'DK',
  'Colombia': 'CO', 'Chile': 'CL', 'Peru': 'PE', 'Senegal': 'SN',
  'Ghana': 'GH', 'Cameroon': 'CM', 'Nigeria': 'NG', 'Poland': 'PL',
  'Serbia': 'RS', 'Ukraine': 'UA', 'Austria': 'AT', 'Hungary': 'HU',
  'Iran': 'IR', 'Indonesia': 'ID', 'New Zealand': 'NZ', 'Honduras': 'HN',
  'Panama': 'PA', 'Venezuela': 'VE', 'Norway': 'NO', 'Slovakia': 'SK',
  'Romania': 'RO', 'Greece': 'GR', 'Kuwait': 'KW', 'Iraq': 'IQ',
};

function getStage(round: string): string {
  const r = round.toLowerCase();
  if (r.includes('group')) return 'group';
  if (r.includes('round of 32')) return 'round_of_32';
  if (r.includes('round of 16')) return 'round_of_16';
  if (r.includes('quarter')) return 'quarter_final';
  if (r.includes('semi')) return 'semi_final';
  if (r.includes('3rd') || r.includes('third')) return 'third_place';
  if (r.includes('final')) return 'final';
  return 'group';
}

async function upsertTeam(teamId: number, teamName: string): Promise<number> {
  const nameHe = HEBREW_NAMES[teamName] || teamName;
  const flag = `https://media.api-sports.io/football/teams/${teamId}.png`;

  const res = await query(`
    INSERT INTO teams (api_id, name_en, name_he, flag_emoji)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (api_id) WHERE api_id IS NOT NULL DO UPDATE SET name_en = $2, name_he = $3, flag_emoji = $4
    RETURNING id
  `, [String(teamId), teamName, nameHe, flag]);
  return res.rows[0].id;
}

async function upsertVenue(venueId: number, venueName: string, venueCity: string): Promise<number> {
  const res = await query(`
    INSERT INTO venues (api_id, name_he, city_he, country_he)
    VALUES ($1, $2, $3, '')
    ON CONFLICT (api_id) WHERE api_id IS NOT NULL DO UPDATE SET name_he = $2, city_he = $3
    RETURNING id
  `, [String(venueId), venueName, venueCity]);
  return res.rows[0].id;
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { fixtureId } = await req.json();
  if (!fixtureId) {
    return NextResponse.json({ error: 'fixtureId נדרש' }, { status: 400 });
  }

  try {
    const data = await apiFetch(`/fixtures?id=${fixtureId}`);
    const f = data?.response?.[0];
    if (!f) {
      return NextResponse.json({ error: `לא נמצא fixture עם ID ${fixtureId}` }, { status: 404 });
    }

    // Upsert home team
    const homeTeamId = await upsertTeam(f.teams.home.id, f.teams.home.name);
    const awayTeamId = await upsertTeam(f.teams.away.id, f.teams.away.name);

    // Upsert venue
    let venueId: number | null = null;
    if (f.fixture.venue?.id) {
      venueId = await upsertVenue(f.fixture.venue.id, f.fixture.venue.name || '', f.fixture.venue.city || '');
    }

    const stage = getStage(f.league?.round || '');
    const statusShort = f.fixture.status?.short || 'NS';
    const dbStatus = ['FT', 'AET', 'PEN'].includes(statusShort) ? 'finished'
      : ['1H', 'HT', '2H', 'ET', 'P'].includes(statusShort) ? 'live'
      : 'scheduled';

    const result = await query(`
      INSERT INTO matches (api_id, apisports_id, home_team_id, away_team_id, venue_id, match_date, stage, status, home_score, away_score)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (api_id) DO UPDATE SET
        apisports_id = $2,
        home_team_id = $3,
        away_team_id = $4,
        venue_id = COALESCE($5, matches.venue_id),
        match_date = $6,
        stage = $7,
        status = CASE WHEN matches.status = 'finished' THEN 'finished' ELSE $8 END,
        home_score = COALESCE($9, matches.home_score),
        away_score = COALESCE($10, matches.away_score),
        updated_at = NOW()
      RETURNING id
    `, [
      String(f.fixture.id),
      f.fixture.id,
      homeTeamId,
      awayTeamId,
      venueId,
      f.fixture.date,
      stage,
      dbStatus,
      f.goals?.home ?? null,
      f.goals?.away ?? null,
    ]);

    const homeNameHe = HEBREW_NAMES[f.teams.home.name] || f.teams.home.name;
    const awayNameHe = HEBREW_NAMES[f.teams.away.name] || f.teams.away.name;

    return NextResponse.json({
      success: true,
      matchId: result.rows[0].id,
      message: `${homeNameHe} נגד ${awayNameHe} נוסף בהצלחה`,
    });
  } catch (error) {
    console.error('Add fixture error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
