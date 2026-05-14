'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatIsraelDate, formatIsraelTime, isMatchLocked } from '@/lib/time';
import TeamFlag from '@/components/TeamFlag';
import { getPointLabel } from '@/lib/scoring';
import { useThemeStore } from '@/stores/themeStore';

function themedLogo(url: string, theme: string) {
  if (theme === 'light' && url.startsWith('/icons/') && url.endsWith('.png')) {
    return url.replace('.png', '_l.png');
  }
  return url;
}

interface MatchDetail {
  id: number;
  home_name_he: string;
  away_name_he: string;
  home_flag: string;
  away_flag: string;
  home_team_id: number;
  away_team_id: number;
  match_date: string;
  status: string;
  stage: string;
  group_letter: string;
  home_score: number | null;
  away_score: number | null;
  elapsed: number | null;
  venue_name: string;
  venue_city: string;
  venue_country: string;
  channel_name: string;
  channel_logo: string;
}

interface MatchEvent {
  id: number;
  elapsed: number;
  elapsed_extra: number | null;
  event_type: string;
  detail: string;
  team_id: number;
  player_name: string;
  assist_name: string | null;
  team_name_he: string;
  team_flag: string;
}

function EventIcon({ type, detail }: { type: string; detail: string }) {
  if (type === 'goal') {
    if (detail.toLowerCase().includes('penalty')) return <span>⚽ פנ׳</span>;
    if (detail.toLowerCase().includes('own')) return <span style={{ filter: 'sepia(1) saturate(5) hue-rotate(310deg)' }}>⚽</span>;
    return <span>⚽</span>;
  }
  if (type === 'card') {
    if (detail.toLowerCase().includes('red') || detail.toLowerCase().includes('second yellow')) return <span>🟥</span>;
    return <span>🟨</span>;
  }
  if (type === 'var') return <span>📺</span>;
  return <span className="text-c-muted">•</span>;
}

function EventRow({ ev, homeTeamId }: { ev: MatchEvent; homeTeamId: number }) {
  const isHome = ev.team_id === homeTeamId;
  const time = ev.elapsed_extra ? `${ev.elapsed}+${ev.elapsed_extra}'` : `${ev.elapsed}'`;
  const isSubst = ev.event_type === 'subst';

  return (
    <div className={`flex items-start gap-1.5 py-1 ${isHome ? 'flex-row' : 'flex-row-reverse'}`}>
      <span className="text-c-muted w-8 text-center shrink-0" style={{ fontSize: 10 }}>{time}</span>
      <span className="text-sm shrink-0"><EventIcon type={ev.event_type} detail={ev.detail} /></span>
      <div className={`flex flex-col flex-1 ${isHome ? 'items-start' : 'items-end'}`}>
        {isSubst ? (
          <>
            {ev.assist_name && (
              <span className="font-semibold leading-tight" style={{ fontSize: 11, color: '#22c55e' }}>
                ↑ {ev.assist_name}
              </span>
            )}
            <span className="leading-tight" style={{ fontSize: 11, color: '#ef4444' }}>
              ↓ {ev.player_name}
            </span>
          </>
        ) : (
          <>
            <span className="font-semibold text-c-text leading-tight" style={{ fontSize: 11 }}>{ev.player_name}</span>
            {ev.assist_name && ev.event_type === 'goal' && (
              <span className="text-c-muted leading-tight" style={{ fontSize: 10 }}>בישול: {ev.assist_name}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface Prediction {
  user_id: number;
  display_name: string;
  home_score: number;
  away_score: number;
  is_double: boolean;
  points: number | null;
}

interface MyPrediction {
  home_score: number;
  away_score: number;
  is_double: boolean;
  points: number | null;
}

const STAGE_LABELS: Record<string, string> = {
  group: 'שלב הבתים',
  round_of_32: 'סבב 32',
  round_of_16: 'שמינית גמר',
  quarter_final: 'רבע גמר',
  semi_final: 'חצי גמר',
  final: 'גמר',
};

export default function MatchDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { theme } = useThemeStore();

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [myPrediction, setMyPrediction] = useState<MyPrediction | null>(null);
  const [allPredictions, setAllPredictions] = useState<Prediction[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [matchStarted, setMatchStarted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [homeInput, setHomeInput] = useState('');
  const [awayInput, setAwayInput] = useState('');
  const [useDouble, setUseDouble] = useState(false);
  const [doubleUsed, setDoubleUsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [sagiPrediction, setSagiPrediction] = useState<{ home_score: number; away_score: number } | null>(null);
  const [groupStandings, setGroupStandings] = useState<Array<{ id: number; name_he: string; flag_emoji: string; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number }> | null>(null);

  const loadMatch = (initial = false) => {
    fetch(`/api/matches/${id}`)
      .then(r => r.json())
      .then(data => {
        setMatch(data.match);
        setMyPrediction(data.myPrediction);
        setSagiPrediction(data.sagiPrediction || null);
        setAllPredictions(data.allPredictions || []);
        setEvents(data.events || []);
        setMatchStarted(data.matchStarted);
        // Fetch group standings for unlocked group matches
        if (initial && data.match?.stage === 'group' && data.match?.group_letter && !isMatchLocked(data.match.match_date)) {
          fetch(`/api/groups/${data.match.group_letter}`)
            .then(r => r.json())
            .then(d => setGroupStandings(d.teams || null))
            .catch(() => {});
        }
        if (initial && data.myPrediction) {
          setHomeInput(String(data.myPrediction.home_score));
          setAwayInput(String(data.myPrediction.away_score));
          setUseDouble(data.myPrediction.is_double);
        }
        if (initial) setLoading(false);
      })
      .catch(() => { if (initial) setLoading(false); });
  };

  useEffect(() => {
    loadMatch(true);
    // Poll every 20s when live
    const interval = setInterval(() => {
      setMatch(prev => {
        if (prev?.status === 'live') loadMatch(false);
        return prev;
      });
    }, 20000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!match) return;
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        const isGroup = match.stage === 'group';
        const used = isGroup ? !data.group_double_available : !data.knockout_double_available;
        // If already has double on this match, it's not "used elsewhere"
        if (myPrediction?.is_double) {
          setDoubleUsed(false);
        } else {
          setDoubleUsed(used);
        }
      });
  }, [match, myPrediction]);

  const handleSave = async () => {
    if (!match) return;
    const h = parseInt(homeInput);
    const a = parseInt(awayInput);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setSaveError('הזן תוצאה תקינה');
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          homeScore: h,
          awayScore: a,
          isDouble: useDouble,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || 'שגיאה');
      } else {
        setSaveSuccess(true);
        setTimeout(() => {
          router.push('/matches');
        }, 800);
      }
    } catch {
      setSaveError('שגיאת שרת');
    }
    setSaving(false);
  };

  if (loading || !match) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#f97316] text-4xl animate-spin">⚽</div>
      </div>
    );
  }

  const locked = isMatchLocked(match.match_date);

  // Deduplicate goals (keep the one with assist when duplicates exist at same elapsed+player),
  // then sort newest → oldest
  const displayEvents = (() => {
    const seen = new Map<string, MatchEvent>();
    for (const ev of events) {
      const key = `${ev.event_type}-${ev.elapsed}-${ev.player_name}`;
      if (ev.event_type === 'goal') {
        const existing = seen.get(key);
        if (!existing || (!existing.assist_name && ev.assist_name)) {
          seen.set(key, ev);
        }
      } else {
        seen.set(key, ev);
      }
    }
    return Array.from(seen.values()).sort((a, b) => b.elapsed - a.elapsed || (b.elapsed_extra ?? 0) - (a.elapsed_extra ?? 0));
  })();

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.push('/matches')}
        className="text-c-muted text-sm mb-4 flex items-center gap-1"
      >
        ← חזרה למשחקים
      </button>

      {/* Match info card */}
      <div className="bg-c-card rounded-2xl border border-c-border p-5 mb-4">
        <div className="text-center text-c-muted text-sm mb-4">
          {formatIsraelDate(match.match_date)} · {formatIsraelTime(match.match_date)}
          {match.stage !== 'group' && (
            <span className="mr-2 text-[#f97316] font-bold">{STAGE_LABELS[match.stage]}</span>
          )}
          {match.stage === 'group' && match.group_letter && (
            <span className="mr-2">{match.group_letter ? `בית ${match.group_letter.charCodeAt(0) - 64}` : 'שלב הבתים'}</span>
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between">
          <div className="flex-1 flex flex-col items-center gap-2">
            <TeamFlag flagEmoji={match.home_flag} size="xl" />
            <span className="font-bold text-c-text text-center">{match.home_name_he}</span>
          </div>

          <div className="mx-4 text-center">
            {match.status === 'finished' || match.status === 'live' ? (
              <div className="text-3xl font-bold text-c-text">
                {match.home_score} - {match.away_score}
              </div>
            ) : (
              <div className="text-c-subtle text-xl font-bold">נגד</div>
            )}
            {match.status === 'live' && (
              <div className="flex flex-col items-center gap-0.5 mt-1">
                <span className="bg-[#22c55e] text-black text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {match.elapsed ? `${match.elapsed}'` : 'חי'}
                </span>
              </div>
            )}
            {match.status === 'finished' && (
              <span className="text-c-muted text-xs">סיים</span>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center gap-2">
            <TeamFlag flagEmoji={match.away_flag} size="xl" />
            <span className="font-bold text-c-text text-center">{match.away_name_he}</span>
          </div>
        </div>

        {(match.venue_city || match.channel_name || match.channel_logo) && (
          <div className="flex items-center justify-center gap-3 mt-4">
            {match.venue_city && (
              <span className="text-c-subtle text-xs">
                {match.venue_name && `${match.venue_name}, `}{match.venue_city}
              </span>
            )}
            {(match.channel_name || match.channel_logo) && (
              match.channel_logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={themedLogo(match.channel_logo, theme)} alt={match.channel_name} className="h-4 object-contain opacity-70" />
              ) : (
                <span className="text-c-muted text-xs">{match.channel_name}</span>
              )
            )}
          </div>
        )}
      </div>

      {/* Live events */}
      {(match.status === 'live' || match.status === 'finished') && events.length > 0 && (
        <div className="bg-c-card rounded-2xl border border-c-border p-4 mb-4">
          <h2 className="font-bold text-c-text mb-3 text-sm">
            {match.status === 'live' ? '🔴 אירועי המשחק' : '📋 סיכום אירועים'}
          </h2>

          {/* All events timeline */}
          <div className="divide-y divide-c-border">
            {displayEvents.map(ev => (
              <EventRow key={ev.id} ev={ev} homeTeamId={match.home_team_id} />
            ))}
          </div>
        </div>
      )}

      {/* Prediction form */}
      {!locked && !matchStarted ? (
        <div className="bg-c-card rounded-2xl border border-c-border p-5 mb-4">
          <h2 className="font-bold text-c-text mb-4">
            {myPrediction ? 'ערוך תחזית' : 'הגש תחזית'}
          </h2>

          {/* Sagi's recommendation */}
          {sagiPrediction && (
            <div className="flex items-center gap-2 mb-4 bg-c-input rounded-xl px-3 py-1 overflow-visible">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/sagi.png" alt="שגיא" className="w-14 h-14 object-contain shrink-0 -my-2" />
              <span className="text-c-muted text-xs flex-1">ההמלצה של שגיא:</span>
              <span className="font-bold text-c-text">{sagiPrediction.home_score} – {sagiPrediction.away_score}</span>
            </div>
          )}

          {/* Score inputs */}
          <div className="flex items-center justify-center gap-4 mb-5">
            <div className="flex flex-col items-center gap-2">
              <TeamFlag flagEmoji={match.home_flag} size="md" />
              <input
                type="number"
                min="0"
                max="20"
                value={homeInput}
                onChange={e => setHomeInput(e.target.value)}
                className="w-20 h-16 text-center text-3xl font-bold bg-c-bg border-2 border-[#f97316] rounded-xl text-c-text focus:outline-none"
                placeholder=""
              />
            </div>
            <span className="text-c-muted text-2xl font-bold">-</span>
            <div className="flex flex-col items-center gap-2">
              <TeamFlag flagEmoji={match.away_flag} size="md" />
              <input
                type="number"
                min="0"
                max="20"
                value={awayInput}
                onChange={e => setAwayInput(e.target.value)}
                className="w-20 h-16 text-center text-3xl font-bold bg-c-bg border-2 border-[#f97316] rounded-xl text-c-text focus:outline-none"
                placeholder=""
              />
            </div>
          </div>

          {/* Double toggle */}
          <div className="mb-5">
            <button
              onClick={() => !doubleUsed && setUseDouble(d => !d)}
              disabled={doubleUsed && !useDouble}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                useDouble
                  ? 'border-[#eab308] bg-[#eab30815]'
                  : doubleUsed
                  ? 'border-c-border bg-c-nav opacity-40 cursor-not-allowed'
                  : 'border-c-border bg-c-nav'
              }`}
            >
              <div className="text-right">
                <div className={`font-bold text-sm ${useDouble ? 'text-[#eab308]' : 'text-c-text'}`}>
                  הכפל נקודות ×2
                </div>
                <div className="text-c-muted text-xs mt-0.5">
                  {doubleUsed && !useDouble ? 'כבר השתמשת בהכפלה לשלב זה' : 'השתמש בהכפלה למשחק זה'}
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full transition-colors relative ${useDouble ? 'bg-[#eab308]' : 'bg-c-border'}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${useDouble ? 'right-0.5' : 'left-0.5'}`} />
              </div>
            </button>
          </div>

          {saveError && (
            <p className="text-[#b91c1c] text-sm text-center mb-3">{saveError}</p>
          )}

          {saveSuccess ? (
            <div className="bg-[#22c55e20] border border-[#22c55e] rounded-xl py-3 text-center">
              <span className="text-[#22c55e] font-bold">✓ התחזית נשמרה!</span>
            </div>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving || !homeInput || !awayInput}
              className="btn-orange disabled:opacity-50"
            >
              {saving ? 'שומר...' : myPrediction ? 'עדכן תחזית' : 'שמור תחזית'}
            </button>
          )}
        </div>
      ) : locked && !matchStarted ? (
        <div className="bg-c-card rounded-2xl border border-c-border p-5 mb-4 text-center">
          <div className="text-c-muted">🔒 הגשת תחזיות נעולה</div>
          {myPrediction ? (
            <div className="mt-3">
              <span className="text-c-muted text-sm">התחזית שלי: </span>
              <span className="text-[#f97316] font-bold text-lg">
                {myPrediction.home_score} - {myPrediction.away_score}
              </span>
              {myPrediction.is_double && (
                <span className="text-[#eab308] text-sm font-bold mr-2">×2</span>
              )}
            </div>
          ) : (
            <div className="text-c-subtle text-sm mt-2">לא הוגשה תחזית</div>
          )}
        </div>
      ) : null}

      {/* All predictions (after match starts) */}
      {matchStarted && allPredictions.length > 0 && (
        <div className="bg-c-card rounded-2xl border border-c-border p-5">
          <h2 className="font-bold text-c-text mb-4">תחזיות כל השחקנים</h2>
          <div className="flex flex-col gap-2">
            {allPredictions.map((pred, i) => (
              <div key={pred.user_id} className="flex items-center justify-between py-2 border-b border-c-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-c-muted text-sm w-5 text-center">{i + 1}</span>
                  <span className="text-c-text font-bold text-sm">{pred.display_name}</span>
                  {pred.is_double && (
                    <span className="text-[#eab308] text-xs font-bold">×2</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#f97316] font-bold">{pred.home_score} - {pred.away_score}</span>
                  <span className={`text-sm font-bold w-8 text-left ${
                    pred.points && pred.points > 0 ? 'text-[#22c55e]' : 'text-c-subtle'
                  }`}>
                    {getPointLabel(pred.points)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {matchStarted && allPredictions.length === 0 && (
        <div className="bg-c-card rounded-2xl border border-c-border p-5 text-center text-c-muted">
          <p>אין תחזיות למשחק זה</p>
        </div>
      )}

      {/* Group standings — only when betting is open, shown at bottom */}
      {!locked && groupStandings && groupStandings.length > 0 && (
        <div className="bg-c-card rounded-2xl border border-c-border p-4 mt-4">
          <h2 className="font-bold text-c-text text-sm mb-3">
            טבלת בית {match.group_letter ? match.group_letter.charCodeAt(0) - 64 : ''}
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-c-muted border-b border-c-border">
                <th className="text-right pb-2 font-medium w-5">#</th>
                <th className="text-right pb-2 font-medium pr-2">קבוצה</th>
                <th className="pb-2 font-medium text-center w-7">מ׳</th>
                <th className="pb-2 font-medium text-center w-7">נ׳</th>
                <th className="pb-2 font-medium text-center w-7">ת׳</th>
                <th className="pb-2 font-medium text-center w-7">ה׳</th>
                <th className="pb-2 font-medium text-center w-10">הפרש</th>
                <th className="pb-2 font-bold text-center w-8 text-[#f97316]">נק׳</th>
              </tr>
            </thead>
            <tbody>
              {groupStandings.map((team, idx) => {
                const isPlaying = team.id === match.home_team_id || team.id === match.away_team_id;
                return (
                  <tr key={team.id} className={`border-b border-c-border last:border-0 ${!isPlaying ? 'opacity-50' : ''}`}>
                    <td className="py-2 text-c-muted">{idx + 1}</td>
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-1.5">
                        <TeamFlag flagEmoji={team.flag_emoji} size="sm" />
                        <span className={isPlaying ? 'font-bold text-c-text' : 'text-c-muted'}>
                          {team.name_he}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 text-center text-c-muted">{team.p}</td>
                    <td className="py-2 text-center text-c-muted">{team.w}</td>
                    <td className="py-2 text-center text-c-muted">{team.d}</td>
                    <td className="py-2 text-center text-c-muted">{team.l}</td>
                    <td className="py-2 text-center text-c-muted">{team.gf - team.ga > 0 ? '+' : ''}{team.gf - team.ga}</td>
                    <td className={`py-2 text-center font-bold ${isPlaying ? 'text-[#f97316]' : 'text-c-text'}`}>{team.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
