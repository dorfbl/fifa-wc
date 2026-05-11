import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';

const API_KEY = process.env.SPORTSDB_API_KEY || '123';
const LEAGUE_ID = process.env.SPORTSDB_LEAGUE_ID || '4429';
const BASE_URL = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;

// Country name → ISO 3166-1 alpha-2 code mapping
const COUNTRY_CODES: Record<string, string> = {
  'Afghanistan': 'AF', 'Albania': 'AL', 'Algeria': 'DZ', 'Angola': 'AO',
  'Argentina': 'AR', 'Armenia': 'AM', 'Australia': 'AU', 'Austria': 'AT',
  'Azerbaijan': 'AZ', 'Bahrain': 'BH', 'Bangladesh': 'BD', 'Belgium': 'BE',
  'Bolivia': 'BO', 'Bosnia-Herzegovina': 'BA', 'Bosnia and Herzegovina': 'BA',
  'Brazil': 'BR', 'Bulgaria': 'BG', 'Burkina Faso': 'BF', 'Cameroon': 'CM',
  'Canada': 'CA', 'Cape Verde': 'CV', 'Chile': 'CL', 'China': 'CN',
  'Colombia': 'CO', 'Congo': 'CG', 'Congo DR': 'CD', 'Costa Rica': 'CR',
  'Croatia': 'HR', 'Cuba': 'CU', 'Curaçao': 'CW', 'Curacao': 'CW',
  'Czech Republic': 'CZ', 'Czechia': 'CZ', 'Denmark': 'DK', 'Ecuador': 'EC',
  'Egypt': 'EG', 'El Salvador': 'SV', 'England': 'GB', 'Ethiopia': 'ET',
  'France': 'FR', 'Gabon': 'GA', 'Germany': 'DE', 'Ghana': 'GH',
  'Greece': 'GR', 'Guatemala': 'GT', 'Guinea': 'GN', 'Haiti': 'HT',
  'Honduras': 'HN', 'Hungary': 'HU', 'India': 'IN', 'Indonesia': 'ID',
  'Iran': 'IR', 'Iraq': 'IQ', 'Ireland': 'IE', 'Israel': 'IL',
  'Italy': 'IT', 'Ivory Coast': 'CI', "Côte d'Ivoire": 'CI', 'Jamaica': 'JM',
  'Japan': 'JP', 'Jordan': 'JO', 'Kenya': 'KE', 'Kuwait': 'KW',
  'Kyrgyzstan': 'KG', 'Lebanon': 'LB', 'Libya': 'LY', 'Mali': 'ML',
  'Mexico': 'MX', 'Morocco': 'MA', 'Mozambique': 'MZ', 'Netherlands': 'NL',
  'New Zealand': 'NZ', 'Nicaragua': 'NI', 'Nigeria': 'NG', 'North Korea': 'KP',
  'Norway': 'NO', 'Oman': 'OM', 'Pakistan': 'PK', 'Panama': 'PA',
  'Paraguay': 'PY', 'Peru': 'PE', 'Philippines': 'PH', 'Poland': 'PL',
  'Portugal': 'PT', 'Qatar': 'QA', 'Romania': 'RO', 'Russia': 'RU',
  'Saudi Arabia': 'SA', 'Scotland': 'GB', 'Senegal': 'SN', 'Serbia': 'RS',
  'Slovakia': 'SK', 'Slovenia': 'SI', 'South Africa': 'ZA', 'South Korea': 'KR',
  'Spain': 'ES', 'Sudan': 'SD', 'Sweden': 'SE', 'Switzerland': 'CH',
  'Syria': 'SY', 'Tanzania': 'TZ', 'Thailand': 'TH', 'Tunisia': 'TN',
  'Turkey': 'TR', 'Türkiye': 'TR', 'Uganda': 'UG', 'Ukraine': 'UA',
  'United Arab Emirates': 'AE', 'UAE': 'AE', 'United States': 'US',
  'USA': 'US', 'Uruguay': 'UY', 'Venezuela': 'VE', 'Vietnam': 'VN',
  'Wales': 'GB', 'Zambia': 'ZM', 'Zimbabwe': 'ZW',
};

// Hebrew name mapping for known WC 2026 teams
const HEBREW_NAMES: Record<string, string> = {
  'Mexico': 'מקסיקו', 'South Africa': 'דרום אפריקה', 'South Korea': 'קוריאה הדרומית',
  'Czech Republic': 'צ\'כיה', 'Czechia': 'צ\'כיה', 'Canada': 'קנדה',
  'Bosnia-Herzegovina': 'בוסניה והרצגובינה', 'Bosnia and Herzegovina': 'בוסניה והרצגובינה',
  'USA': 'ארצות הברית', 'United States': 'ארצות הברית', 'Paraguay': 'פרגוואי',
  'Brazil': 'ברזיל', 'Morocco': 'מרוקו', 'Qatar': 'קטאר',
  'Switzerland': 'שוויץ', 'Haiti': 'האיטי', 'Scotland': 'סקוטלנד',
  'Germany': 'גרמניה', 'Curaçao': 'קוראסאו', 'Curacao': 'קוראסאו',
  'Ivory Coast': 'חוף השנהב', "Côte d'Ivoire": 'חוף השנהב',
  'Ecuador': 'אקוודור', 'Netherlands': 'הולנד', 'Japan': 'יפן',
  'Australia': 'אוסטרליה', 'Turkey': 'טורקיה', 'Türkiye': 'טורקיה',
  'Belgium': 'בלגיה', 'Egypt': 'מצרים', 'Saudi Arabia': 'ערב הסעודית',
  'Uruguay': 'אורוגוואי', 'Spain': 'ספרד', 'Cape Verde': 'כף ורדה',
  'Sweden': 'שוודיה', 'Tunisia': 'תוניסיה', 'Argentina': 'ארגנטינה',
  'France': 'צרפת', 'England': 'אנגליה', 'Portugal': 'פורטוגל',
  'Italy': 'איטליה', 'Croatia': 'קרואטיה', 'Denmark': 'דנמרק',
  'Colombia': 'קולומביה', 'Chile': 'צ\'ילה', 'Peru': 'פרו',
  'Senegal': 'סנגל', 'Ghana': 'גאנה', 'Cameroon': 'קמרון',
  'Nigeria': 'ניגריה', 'Poland': 'פולין', 'Serbia': 'סרביה',
  'Ukraine': 'אוקראינה', 'Austria': 'אוסטריה', 'Hungary': 'הונגריה',
  'Iran': 'איראן', 'Indonesia': 'אינדונזיה', 'New Zealand': 'ניו זילנד',
  'Honduras': 'הונדורס', 'Panama': 'פנמה', 'Venezuela': 'ונצואלה',
  'Norway': 'נורבגיה', 'Slovakia': 'סלובקיה', 'Romania': 'רומניה',
  'Greece': 'יוון', 'Bosnia': 'בוסניה',
};

function getFlagUrl(countryCode: string): string {
  return `https://flagsapi.com/${countryCode}/flat/64.png`;
}

function getStage(roundStr: string, groupStr: string): string {
  const r = (roundStr || '').toLowerCase();
  if (groupStr) return 'group';
  if (r.includes('quarter')) return 'quarter_final';
  if (r.includes('semi')) return 'semi_final';
  if (r === 'final' || r.includes('world cup final')) return 'final';
  if (r.includes('round of 16') || r.includes('16')) return 'round_of_16';
  if (r.includes('round of 32') || r.includes('32')) return 'round_of_32';
  return 'group';
}

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    // Step 1: Fetch all events for the season
    const seasonRes = await fetch(`${BASE_URL}/eventsseason.php?id=${LEAGUE_ID}&s=2026`);
    const seasonData = await seasonRes.json();
    const events = seasonData.events || [];

    if (events.length === 0) {
      return NextResponse.json({ error: 'לא נמצאו משחקים ב-API' }, { status: 404 });
    }

    let synced = 0;
    let errors = 0;

    // Step 2: For each event, fetch full details via lookupevent
    for (const basicEvent of events) {
      try {
        const detailRes = await fetch(`${BASE_URL}/lookupevent.php?id=${basicEvent.idEvent}`);
        const detailData = await detailRes.json();
        const event = detailData.events?.[0];
        if (!event) { errors++; continue; }

        // --- Handle Home Team ---
        const homeName = event.strHomeTeam;
        const homeCode = COUNTRY_CODES[homeName] || '';
        const homeHebrew = HEBREW_NAMES[homeName] || homeName;
        const homeFlagUrl = homeCode ? getFlagUrl(homeCode) : '';

        let homeTeamId: number | null = null;
        const existingHome = await query(
          'SELECT id FROM teams WHERE api_id = $1 OR name_en ILIKE $2 LIMIT 1',
          [event.idHomeTeam, homeName]
        );
        if (existingHome.rows.length > 0) {
          homeTeamId = existingHome.rows[0].id;
          await query(
            'UPDATE teams SET api_id = $1, country_code = $2, flag_emoji = $3, name_he = CASE WHEN name_he = \'לא נקבע\' OR name_he = name_en THEN $4 ELSE name_he END WHERE id = $5',
            [event.idHomeTeam, homeCode, homeFlagUrl, homeHebrew, homeTeamId]
          );
        } else {
          const ins = await query(
            'INSERT INTO teams (api_id, name_en, name_he, flag_emoji, country_code, group_letter) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [event.idHomeTeam, homeName, homeHebrew, homeFlagUrl, homeCode, event.strGroup || null]
          );
          homeTeamId = ins.rows[0].id;
        }

        // --- Handle Away Team ---
        const awayName = event.strAwayTeam;
        const awayCode = COUNTRY_CODES[awayName] || '';
        const awayHebrew = HEBREW_NAMES[awayName] || awayName;
        const awayFlagUrl = awayCode ? getFlagUrl(awayCode) : '';

        let awayTeamId: number | null = null;
        const existingAway = await query(
          'SELECT id FROM teams WHERE api_id = $1 OR name_en ILIKE $2 LIMIT 1',
          [event.idAwayTeam, awayName]
        );
        if (existingAway.rows.length > 0) {
          awayTeamId = existingAway.rows[0].id;
          await query(
            'UPDATE teams SET api_id = $1, country_code = $2, flag_emoji = $3, name_he = CASE WHEN name_he = \'לא נקבע\' OR name_he = name_en THEN $4 ELSE name_he END WHERE id = $5',
            [event.idAwayTeam, awayCode, awayFlagUrl, awayHebrew, awayTeamId]
          );
        } else {
          const ins = await query(
            'INSERT INTO teams (api_id, name_en, name_he, flag_emoji, country_code, group_letter) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [event.idAwayTeam, awayName, awayHebrew, awayFlagUrl, awayCode, event.strGroup || null]
          );
          awayTeamId = ins.rows[0].id;
        }

        // --- Handle Venue ---
        let venueId: number | null = null;
        if (event.strVenue) {
          const existingVenue = await query(
            'SELECT id FROM venues WHERE api_id = $1 OR name_he ILIKE $2 LIMIT 1',
            [event.idVenue, event.strVenue]
          );
          if (existingVenue.rows.length > 0) {
            venueId = existingVenue.rows[0].id;
            if (event.idVenue) {
              await query('UPDATE venues SET api_id = $1 WHERE id = $2 AND api_id IS NULL', [event.idVenue, venueId]);
            }
          } else {
            const cityStr = (event.strCity || event.strCountry || '').replace(', MX', '').replace(', CA', '').replace(', US', '').trim();
            const ins = await query(
              'INSERT INTO venues (api_id, name_he, city_he, country_he) VALUES ($1, $2, $3, $4) RETURNING id',
              [event.idVenue || null, event.strVenue, cityStr, event.strCountry || '']
            );
            venueId = ins.rows[0].id;
          }
        }

        // --- Determine stage ---
        const stage = getStage(String(event.intRound || ''), event.strGroup || '');

        // --- Parse date ---
        const matchDate = event.strTimestamp ? new Date(event.strTimestamp + 'Z') : null;
        if (!matchDate) { errors++; continue; }

        // --- Upsert match ---
        await query(`
          INSERT INTO matches (api_id, home_team_id, away_team_id, venue_id, match_date, stage, group_letter, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (api_id) DO UPDATE SET
            home_team_id = $2,
            away_team_id = $3,
            venue_id = COALESCE($4, matches.venue_id),
            match_date = $5,
            stage = $6,
            group_letter = COALESCE($7, matches.group_letter),
            status = CASE
              WHEN $8 = 'Not Started' THEN COALESCE(matches.status, 'scheduled')
              WHEN $8 = 'Match Finished' THEN 'finished'
              WHEN $8 IN ('1H','2H','HT','ET','PEN') THEN 'live'
              ELSE matches.status
            END,
            updated_at = NOW()
        `, [
          event.idEvent,
          homeTeamId,
          awayTeamId,
          venueId,
          matchDate,
          stage,
          event.strGroup || null,
          event.strStatus || 'Not Started',
        ]);

        synced++;
      } catch (err) {
        console.error(`Error syncing event ${basicEvent.idEvent}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      errors,
      total: events.length,
      message: `סונכרנו ${synced} משחקים בהצלחה${errors > 0 ? `, ${errors} שגיאות` : ''}`,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'שגיאת סנכרון' }, { status: 500 });
  }
}
