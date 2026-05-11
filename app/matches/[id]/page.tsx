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
  match_date: string;
  status: string;
  stage: string;
  group_letter: string;
  home_score: number | null;
  away_score: number | null;
  venue_name: string;
  venue_city: string;
  venue_country: string;
  channel_name: string;
  channel_logo: string;
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
  const [matchStarted, setMatchStarted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [homeInput, setHomeInput] = useState('');
  const [awayInput, setAwayInput] = useState('');
  const [useDouble, setUseDouble] = useState(false);
  const [doubleUsed, setDoubleUsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/matches/${id}`)
      .then(r => r.json())
      .then(data => {
        setMatch(data.match);
        setMyPrediction(data.myPrediction);
        setAllPredictions(data.allPredictions || []);
        setMatchStarted(data.matchStarted);
        if (data.myPrediction) {
          setHomeInput(String(data.myPrediction.home_score));
          setAwayInput(String(data.myPrediction.away_score));
          setUseDouble(data.myPrediction.is_double);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Double availability checked after match loads
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
              <span className="text-[#22c55e] text-xs font-bold animate-pulse">חי</span>
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
                <img src={themedLogo(match.channel_logo, theme)} alt={match.channel_name} className="h-6 object-contain opacity-80" />
              ) : (
                <span className="text-c-muted text-xs">{match.channel_name}</span>
              )
            )}
          </div>
        )}
      </div>

      {/* Prediction form */}
      {!locked && !matchStarted ? (
        <div className="bg-c-card rounded-2xl border border-c-border p-5 mb-4">
          <h2 className="font-bold text-c-text mb-4">
            {myPrediction ? 'ערוך תחזית' : 'הגש תחזית'}
          </h2>

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
    </div>
  );
}
