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
  'Bosnia': 'בוסניה', 'Bosnia & Herzegovina': 'בוסניה והרצגובינה',
  'USA': 'ארצות הברית', 'United States': 'ארצות הברית', 'Paraguay': 'פרגוואי',
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
  'Colombia': 'קולומביה', "Chile": "צ'ילה", 'Peru': 'פרו',
  'Senegal': 'סנגל', 'Ghana': 'גאנה', 'Cameroon': 'קמרון',
  'Nigeria': 'ניגריה', 'Poland': 'פולין', 'Serbia': 'סרביה',
  'Ukraine': 'אוקראינה', 'Austria': 'אוסטריה', 'Hungary': 'הונגריה',
  'Iran': 'איראן', 'Indonesia': 'אינדונזיה', 'New Zealand': 'ניו זילנד',
  'Honduras': 'הונדורס', 'Panama': 'פנמה', 'Venezuela': 'ונצואלה',
  'Norway': 'נורבגיה', 'Slovakia': 'סלובקיה', 'Romania': 'רומניה',
  'Greece': 'יוון', 'Kuwait': 'כווית', 'Iraq': 'עיראק',
  'Algeria': "אלג'יריה", 'Cape Verde Islands': 'כף ורדה', 'Congo DR': 'קונגו',
  'Curaçao': 'קוראסאו', 'Jordan': 'ירדן', 'Türkiye': 'טורקיה', 'Uzbekistan': 'אוזבקיסטן',
  'New Caledonia': 'קלדוניה החדשה', 'Tahiti': 'טהיטי', 'Costa Rica': 'קוסטה ריקה',
  'Jamaica': "ג'מייקה", 'Bolivia': 'בוליביה', 'China': 'סין', 'Philippines': 'פיליפינים',
  'Thailand': 'תאילנד', 'Vietnam': 'וייטנאם', 'Malaysia': 'מלזיה',
  'Bahrain': 'בחריין', 'Oman': 'עומאן', 'Syria': 'סוריה', 'Palestine': 'פלסטין',
  'Lebanon': 'לבנון', 'Yemen': 'תימן', 'Libya': 'לוב', 'Mali': 'מאלי',
  'Mozambique': 'מוזמביק', 'Zambia': 'זמביה', 'Zimbabwe': 'זימבבואה',
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
  'Algeria': 'DZ', 'Cape Verde Islands': 'CV', 'Congo DR': 'CD',
  'Curaçao': 'CW', 'Jordan': 'JO', 'Türkiye': 'TR', 'Uzbekistan': 'UZ',
  'New Caledonia': 'NC', 'Tahiti': 'PF', 'Costa Rica': 'CR',
  'Jamaica': 'JM', 'Bolivia': 'BO', 'China': 'CN', 'Philippines': 'PH',
  'Thailand': 'TH', 'Vietnam': 'VN', 'Malaysia': 'MY',
  'Bahrain': 'BH', 'Oman': 'OM', 'Syria': 'SY', 'Palestine': 'PS',
  'Lebanon': 'LB', 'Yemen': 'YE', 'Libya': 'LY', 'Mali': 'ML',
  'Mozambique': 'MZ', 'Zambia': 'ZM', 'Zimbabwe': 'ZW',
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

// Extract group letter from round name e.g. "Group Stage - 3" → null (no letter in round)
// Group letter comes from standings map, this is just a fallback
function getGroupLetterFromRound(round: string): string | null {
  const m = round.match(/Group ([A-L])\b/i);
  return m ? m[1].toUpperCase() : null;
}

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    // 1. Fetch standings → build teamId→groupLetter map
    const standingsData = await apiFetch('/standings?league=1&season=2026');
    const teamGroupMap = new Map<number, string>();
    const groups: Array<Array<{ team: { id: number }; group: string }>> = standingsData.response?.[0]?.league?.standings || [];
    for (const group of groups) {
      if (!group[0]) continue;
      const raw = group[0].group || '';
      const letter = raw.replace(/^Group\s+/i, '').trim();
      // Skip non-group entries like "Ranking of third-placed teams"
      if (!letter || letter.length > 5 || !/^[A-Z0-9]+$/i.test(letter)) continue;
      for (const entry of group) {
        teamGroupMap.set(entry.team.id, letter);
      }
    }

    // 2. Fetch teams → upsert
    const teamsData = await apiFetch('/teams?league=1&season=2026');
    const teamRows: Array<{ team: { id: number; name: string; logo: string }; venue: { id: number; name: string; city: string } }> = teamsData.response || [];

    const venueIdMap = new Map<number, number>(); // apisports venueId → db id
    const venueNameMap = new Map<string, number>(); // venue name (lowercase) → db id

    for (const { team, venue } of teamRows) {
      const nameHe = HEBREW_NAMES[team.name] || team.name;
      const flag = `https://media.api-sports.io/football/teams/${team.id}.png`;
      const groupLetter = teamGroupMap.get(team.id) || null;

      // Upsert team by apisports_id or english name
      await query(`
        INSERT INTO teams (api_id, name_en, name_he, flag_emoji, group_letter)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (api_id) WHERE api_id IS NOT NULL DO UPDATE SET
          name_en = $2, name_he = $3, flag_emoji = $4, group_letter = COALESCE($5, teams.group_letter)
      `, [String(team.id), team.name, nameHe, flag, groupLetter]);

      // Upsert venue
      if (venue?.id) {
        const vRes = await query(`
          INSERT INTO venues (api_id, name_en, name_he, city_he, country_he)
          VALUES ($1, $2, $2, $3, '')
          ON CONFLICT (api_id) WHERE api_id IS NOT NULL DO UPDATE SET name_en = $2, city_he = $3
          RETURNING id
        `, [String(venue.id), venue.name, venue.city || '']);
        venueIdMap.set(venue.id, vRes.rows[0].id);
        if (venue.name) venueNameMap.set(venue.name.toLowerCase(), vRes.rows[0].id);
      }
    }

    // 3. Fetch fixtures → upsert matches
    const fixturesData = await apiFetch('/fixtures?league=1&season=2026');
    const fixtures = fixturesData.response || [];

    let synced = 0;
    for (const f of fixtures) {
      const homeRes = await query('SELECT id FROM teams WHERE api_id = $1', [String(f.teams.home.id)]);
      const awayRes = await query('SELECT id FROM teams WHERE api_id = $1', [String(f.teams.away.id)]);
      if (!homeRes.rows[0] || !awayRes.rows[0]) continue;

      const homeTeamId = homeRes.rows[0].id;
      const awayTeamId = awayRes.rows[0].id;

      // Get venue — use fixture's venue id if available, else match by name
      let venueId: number | null = null;
      const fv = f.fixture.venue;
      if (fv?.id) {
        venueId = venueIdMap.get(fv.id) || null;
        if (!venueId) {
          const vRes = await query(`
            INSERT INTO venues (api_id, name_en, name_he, city_he, country_he)
            VALUES ($1, $2, $2, $3, '')
            ON CONFLICT (api_id) WHERE api_id IS NOT NULL DO UPDATE SET name_en = $2, city_he = $3
            RETURNING id
          `, [String(fv.id), fv.name || '', fv.city || '']);
          venueId = vRes.rows[0].id;
          if (venueId) venueIdMap.set(fv.id, venueId);
        }
      } else if (fv?.name) {
        // venue.id is null — try name map first, then DB lookup
        venueId = venueNameMap.get(fv.name.toLowerCase()) || null;
        if (!venueId) {
          const nameRes = await query(
            `SELECT id FROM venues WHERE name_en = $1 LIMIT 1`,
            [fv.name]
          );
          if (nameRes.rows[0]) {
            venueId = nameRes.rows[0].id;
            venueNameMap.set(fv.name.toLowerCase(), venueId!);
          } else {
            // Insert new venue without api_id
            const vRes = await query(`
              INSERT INTO venues (name_en, name_he, city_he, country_he)
              VALUES ($1, $1, $2, '')
              RETURNING id
            `, [fv.name, fv.city || '']);
            venueId = vRes.rows[0].id;
            venueNameMap.set(fv.name.toLowerCase(), venueId!);
          }
        }
      }

      const stage = getStage(f.league.round || '');
      const groupLetter = teamGroupMap.get(f.teams.home.id) || getGroupLetterFromRound(f.league.round || '') || null;
      const statusShort = f.fixture.status?.short || 'NS';
      const dbStatus = ['FT','AET','PEN'].includes(statusShort) ? 'finished'
        : ['1H','HT','2H','ET','P'].includes(statusShort) ? 'live'
        : 'scheduled';

      const venueName = fv?.name || null;
      const venueCity = fv?.city || null;
      const wentExtra = ['AET', 'PEN'].includes(statusShort);
      const score90Home = wentExtra ? (f.score?.fulltime?.home ?? null) : null;
      const score90Away = wentExtra ? (f.score?.fulltime?.away ?? null) : null;
      const penHome = f.score?.penalty?.home ?? null;
      const penAway = f.score?.penalty?.away ?? null;

      await query(`
        INSERT INTO matches (api_id, apisports_id, home_team_id, away_team_id, venue_id, venue_name_api, venue_city_api, match_date, stage, group_letter, status, home_score, away_score, score_90_home, score_90_away, pen_home, pen_away)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (apisports_id) WHERE apisports_id IS NOT NULL DO UPDATE SET
          api_id = $1,
          home_team_id = $3,
          away_team_id = $4,
          venue_id = COALESCE($5, matches.venue_id),
          venue_name_api = COALESCE($6, matches.venue_name_api),
          venue_city_api = COALESCE($7, matches.venue_city_api),
          match_date = $8,
          stage = $9,
          group_letter = COALESCE($10, matches.group_letter),
          status = CASE WHEN matches.status = 'finished' THEN 'finished' ELSE $11 END,
          home_score = COALESCE($12, matches.home_score),
          away_score = COALESCE($13, matches.away_score),
          score_90_home = $14,
          score_90_away = $15,
          pen_home = $16,
          pen_away = $17,
          updated_at = NOW()
      `, [
        String(f.fixture.id),
        f.fixture.id,
        homeTeamId,
        awayTeamId,
        venueId,
        venueName,
        venueCity,
        f.fixture.date,
        stage,
        groupLetter,
        dbStatus,
        f.goals.home,
        f.goals.away,
        score90Home,
        score90Away,
        penHome,
        penAway,
      ]);
      synced++;
    }

    return NextResponse.json({
      success: true,
      synced,
      teams: teamRows.length,
      message: `סונכרנו ${synced} משחקים ו-${teamRows.length} קבוצות`,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'שגיאת סנכרון' }, { status: 500 });
  }
}
