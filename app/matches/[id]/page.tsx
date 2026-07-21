'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  score_90_home: number | null;
  score_90_away: number | null;
  pen_home: number | null;
  pen_away: number | null;
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

const DRUM_H = 44;       // px per slot (smaller overall height)
const DRUM_ANGLE = 28;   // degrees between items on the cylinder
const DRUM_R = 76;       // virtual cylinder radius px

const DRUM_THEMES = {
  dark: {
    shellBg:      'linear-gradient(180deg,#0d0a14 0%,#140e1e 50%,#0d0a14 100%)',
    shellBorder:  'rgba(147,51,234,0.55)',
    shellShadow:  '0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
    fadeBg:       'rgba(13,10,20,',
    selectedBg:   'rgba(147,51,234,0.38)',
    selectedText: '#ffffff',
    selectedGlow: '0 0 16px rgba(147,51,234,0.9)',
    idleText:     'rgba(210,185,255,0.88)',
    railColor:    'rgba(147,51,234,0.65)',
    sheen:        'rgba(255,255,255,0.07)',
    arrowColor:   'rgba(147,51,234,0.55)',
  },
  light: {
    shellBg:      'linear-gradient(180deg,#f5f0ff 0%,#ede5ff 50%,#f5f0ff 100%)',
    shellBorder:  'rgba(147,51,234,0.35)',
    shellShadow:  '0 4px 20px rgba(147,51,234,0.15), inset 0 1px 0 rgba(255,255,255,0.9)',
    fadeBg:       'rgba(245,240,255,',
    selectedBg:   'rgba(147,51,234,0.85)',
    selectedText: '#ffffff',
    selectedGlow: '0 0 12px rgba(147,51,234,0.5)',
    idleText:     'rgba(60,30,90,0.80)',
    railColor:    'rgba(147,51,234,0.50)',
    sheen:        'rgba(255,255,255,0.60)',
    arrowColor:   'rgba(147,51,234,0.45)',
  },
} as const;

function DrumPicker({ value, onChange, theme = 'dark' }: { value: number; onChange: (n: number) => void; theme?: string }) {
  const scrollRef  = useRef<HTMLDivElement>(null);
  const snapTimer  = useRef<NodeJS.Timeout | null>(null);
  const rafRef     = useRef<number | null>(null);
  const isSnapping = useRef(false);
  const [fraction, setFraction] = useState<number>(value);
  const c = DRUM_THEMES[theme === 'light' ? 'light' : 'dark'];

  // Custom ease-out-quart snap — much smoother than browser smooth-scroll
  const smoothSnapTo = (targetTop: number) => {
    if (!scrollRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    isSnapping.current = true;
    const startTop = scrollRef.current.scrollTop;
    const diff = targetTop - startTop;
    if (Math.abs(diff) < 0.5) { isSnapping.current = false; return; }
    const duration = Math.min(280, 60 + Math.abs(diff) * 2.2);
    const t0 = performance.now();
    const tick = (now: number) => {
      if (!scrollRef.current) { isSnapping.current = false; return; }
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 4); // ease-out-quart
      const top = startTop + diff * eased;
      scrollRef.current.scrollTop = top;
      setFraction(top / DRUM_H);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        scrollRef.current.scrollTop = targetTop;
        setFraction(targetTop / DRUM_H);
        isSnapping.current = false;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = value * DRUM_H;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    const cur = scrollRef.current.scrollTop / DRUM_H;
    if (Math.abs(cur - value) > 0.1) smoothSnapTo(value * DRUM_H);
    else setFraction(value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const onScroll = () => {
    if (!scrollRef.current || isSnapping.current) return;
    // Update visual every frame — no RAF batching so it tracks finger exactly
    setFraction(scrollRef.current.scrollTop / DRUM_H);
    // Wait for momentum to die out, then snap
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      if (!scrollRef.current || isSnapping.current) return;
      const idx = Math.max(0, Math.min(20, Math.round(scrollRef.current.scrollTop / DRUM_H)));
      smoothSnapTo(idx * DRUM_H);
      onChange(idx);
    }, 120);
  };

  const H = DRUM_H * 3;

  return (
    <div style={{ position: 'relative', width: 84, height: H, userSelect: 'none' }}>

      {/* ── Visual drum shell ── */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: 16,
        overflow: 'hidden',
        background: c.shellBg,
        border: `1.5px solid ${c.shellBorder}`,
        boxShadow: c.shellShadow,
        perspective: '560px',
      }}>

        {/* Fixed selection fill — behind numbers (zIndex 1) */}
        <div style={{
          position: 'absolute', left: 0, right: 0,
          top: DRUM_H, height: DRUM_H,
          background: c.selectedBg,
          pointerEvents: 'none', zIndex: 1,
        }} />

        {/* 3-D items — above the fill (zIndex 2) */}
        {Array.from({ length: 21 }, (_, i) => {
          const d = i - fraction;
          if (Math.abs(d) > 2.6) return null;
          const angleDeg = d * DRUM_ANGLE;
          const angleRad = angleDeg * (Math.PI / 180);
          const ty      = DRUM_R * Math.sin(angleRad);
          const cosA    = Math.cos(angleRad);
          const opacity = Math.max(0, Math.pow(cosA, 1.5));
          const isCenter = Math.abs(d) < 0.5;
          const fontSize = 11 + cosA * 19;

          return (
            <div key={i} style={{
              position: 'absolute', left: 0, right: 0, height: DRUM_H,
              top: '50%', zIndex: 2,
              transform: `translateY(calc(-50% + ${ty}px)) rotateX(${-angleDeg}deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity,
            }}>
              <span style={{
                fontSize,
                fontWeight: 900,
                color: isCenter ? c.selectedText : c.idleText,
                lineHeight: 1,
                letterSpacing: '-0.5px',
                textShadow: isCenter ? c.selectedGlow : 'none',
              }}>{i}</span>
            </div>
          );
        })}

        {/* Rail lines — above numbers (zIndex 6) */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: DRUM_H - 1,     height: 1.5, background: c.railColor, pointerEvents: 'none', zIndex: 6 }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: DRUM_H * 2 - 1, height: 1.5, background: c.railColor, pointerEvents: 'none', zIndex: 6 }} />

        {/* Depth gradient */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4,
          background: `linear-gradient(to bottom, ${c.fadeBg}0.82) 0%, transparent 30%, transparent 70%, ${c.fadeBg}0.82) 100%)`,
        }} />

        {/* Edge sheen */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1, background: c.sheen, zIndex: 6, pointerEvents: 'none' }} />
      </div>

      {/* Drag-hint arrows */}
      <div style={{
        position: 'absolute', right: -13, top: '50%', transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        pointerEvents: 'none',
      }}>
        <span style={{ fontSize: 7, color: c.arrowColor, lineHeight: 1 }}>▲</span>
        <span style={{ fontSize: 7, color: c.arrowColor, lineHeight: 1 }}>▼</span>
      </div>

      {/* Invisible scroll layer — no CSS snap; our animation handles it */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="[&::-webkit-scrollbar]:hidden"
        style={{
          position: 'absolute', inset: 0,
          overflowY: 'scroll',
          scrollbarWidth: 'none',
          opacity: 0,
          zIndex: 10,
          cursor: 'ns-resize',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}
      >
        <div style={{ height: DRUM_H }} />
        {Array.from({ length: 21 }, (_, i) => (
          <div key={i} style={{ height: DRUM_H }} />
        ))}
        <div style={{ height: DRUM_H }} />
      </div>
    </div>
  );
}

function InjuryAvatar({ photo, name }: { photo: string | null; name: string }) {
  const [err, setErr] = useState(false);
  if (!photo || err) {
    return (
      <div className="w-6 h-6 rounded-full bg-c-border flex items-center justify-center text-c-subtle shrink-0" style={{ fontSize: 9 }}>
        {name.charAt(0)}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo} alt={name} width={24} height={24} onError={() => setErr(true)}
      className="w-6 h-6 rounded-full object-cover bg-c-border shrink-0" />
  );
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
  scorer_bonus: number | null;
}

interface MyPrediction {
  home_score: number;
  away_score: number;
  is_double: boolean;
  points: number | null;
  scorer_bonus: number | null;
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
  const [predictionsRevealed, setPredictionsRevealed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [homeVal, setHomeVal] = useState(0);
  const [awayVal, setAwayVal] = useState(0);
  const [useDouble, setUseDouble] = useState(false);
  const [doubleUsed, setDoubleUsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [sagiPrediction, setSagiPrediction] = useState<{ home_score: number; away_score: number } | null>(null);
  const [groupStandings, setGroupStandings] = useState<Array<{ id: number; name_he: string; flag_emoji: string; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number }> | null>(null);
  const [injuries, setInjuries] = useState<{ home: { name: string; photo: string | null; reason: string }[]; away: { name: string; photo: string | null; reason: string }[] } | null>(null);

  // Remember which match we're on so the list can scroll back to it
  useEffect(() => {
    if (id) sessionStorage.setItem('lastMatchId', String(id));
  }, [id]);

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
        setPredictionsRevealed(data.predictionsRevealed ?? data.matchStarted);
        // Fetch group standings for unlocked group matches
        if (initial && data.match?.stage === 'group' && data.match?.group_letter && !isMatchLocked(data.match.match_date)) {
          fetch(`/api/groups/${data.match.group_letter}`)
            .then(r => r.json())
            .then(d => setGroupStandings(d.teams || null))
            .catch(() => {});
        }
        // Fetch injuries (skip finished matches)
        if (initial && data.match?.status !== 'finished') {
          fetch(`/api/matches/${id}/injuries`)
            .then(r => r.json())
            .then(d => {
              if (d.home?.length > 0 || d.away?.length > 0) setInjuries(d);
            })
            .catch(() => {});
        }
        if (initial && data.myPrediction) {
          setHomeVal(data.myPrediction.home_score);
          setAwayVal(data.myPrediction.away_score);
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
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id, homeScore: homeVal, awayScore: awayVal, isDouble: useDouble }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || 'שגיאה');
      } else {
        setSaveSuccess(true);
        setTimeout(() => router.push(`/matches?focus=${match.id}`), 600);
      }
    } catch {
      setSaveError('שגיאת שרת');
    }
    setSaving(false);
  };


  if (loading || !match) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#9333ea] text-4xl animate-spin">⚽</div>
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

      {/* ── COMBINED MATCH + BET CARD ── */}
      <div className="bg-c-card rounded-2xl border border-c-border p-5 mb-4">

        {/* Date / stage */}
        <div className="text-center text-c-muted text-sm mb-1">
          {formatIsraelDate(match.match_date)} · {formatIsraelTime(match.match_date)}
          {match.stage !== 'group'
            ? <span className="mr-2 text-[#9333ea] font-bold"> · {STAGE_LABELS[match.stage]}</span>
            : match.group_letter
              ? <span className="mr-1"> · בית {match.group_letter.charCodeAt(0) - 64}</span>
              : null}
        </div>

        {/* Venue */}
        {(match.venue_name || match.venue_city) && (
          <div className="text-center text-c-subtle text-xs mb-4">
            {[match.venue_name, match.venue_city].filter(Boolean).join(', ')}
          </div>
        )}
        {!(match.venue_name || match.venue_city) && <div className="mb-4" />}

        {/* Teams + score/pickers */}
        {!locked && !matchStarted ? (
          /* ── BETTING MODE: flags on top, drums below each ── */
          <div className="flex items-start justify-center gap-3">
            {/* Home */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <TeamFlag flagEmoji={match.home_flag} size="xl" />
              <span className="font-bold text-c-text text-sm text-center leading-tight">{match.home_name_he}</span>
              <DrumPicker value={homeVal} onChange={setHomeVal} theme={theme} />
            </div>
            {/* Middle */}
            <div className="flex flex-col items-center pt-6 gap-2 shrink-0">
              <span className="text-c-subtle text-lg font-bold">נגד</span>
              {sagiPrediction && (
                <div className="flex flex-col items-center mt-2 gap-0.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/sagi.png" alt="שגיא" className="w-10 h-10 object-contain" />
                  <span className="text-[10px] text-c-muted">שגיא:</span>
                  <span className="text-xs font-bold text-c-text">{sagiPrediction.home_score}–{sagiPrediction.away_score}</span>
                </div>
              )}
            </div>
            {/* Away */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <TeamFlag flagEmoji={match.away_flag} size="xl" />
              <span className="font-bold text-c-text text-sm text-center leading-tight">{match.away_name_he}</span>
              <DrumPicker value={awayVal} onChange={setAwayVal} theme={theme} />
            </div>
          </div>
        ) : (
          /* ── VIEW MODE: flags + score/status ── */
          <div className="flex items-center justify-between">
            <div className="flex-1 flex flex-col items-center gap-2">
              <TeamFlag flagEmoji={match.home_flag} size="xl" />
              <span className="font-bold text-c-text text-center text-sm">{match.home_name_he}</span>
            </div>
            <div className="mx-4 text-center">
              {match.status === 'finished' || match.status === 'live' ? (
                <div className="flex flex-col items-center gap-0.5">
                  <div className="text-3xl font-bold text-c-text">{match.home_score} - {match.away_score}</div>
                  {match.pen_home != null && <span className="text-xs text-[#9333ea] font-semibold">({match.pen_home}-{match.pen_away} ע״ב)</span>}
                  {match.score_90_home != null && match.pen_home == null && <span className="text-xs text-c-muted">90′: {match.score_90_home}-{match.score_90_away} · הארכה</span>}
                </div>
              ) : (
                <div className="text-c-subtle text-xl font-bold">נגד</div>
              )}
              {match.status === 'live' && (
                <span className="mt-1 bg-[#22c55e] text-black text-xs font-bold px-2 py-0.5 rounded-full animate-pulse block">
                  {match.elapsed ? `${match.elapsed}'` : 'חי'}
                </span>
              )}
              {match.status === 'finished' && !match.pen_home && !match.score_90_home && (
                <span className="text-c-muted text-xs">סיים</span>
              )}
              {locked && !matchStarted && myPrediction && (
                <div className="mt-2 text-xs text-c-muted">
                  <span className="text-[#9333ea] font-bold text-base">{myPrediction.home_score} - {myPrediction.away_score}</span>
                  {myPrediction.is_double && <span className="text-[#eab308] font-bold mr-1"> ×2</span>}
                  <div className="text-c-subtle">התחזית שלי</div>
                </div>
              )}
              {(match.status === 'finished' || match.status === 'live') && myPrediction?.points !== null && myPrediction?.points !== undefined && (
                <div className="mt-2 flex items-center gap-1.5 justify-center">
                  {(myPrediction.scorer_bonus ?? 0) > 0 && (
                    <span className="text-[#f97316] text-xs font-bold bg-[#f9731620] px-1.5 py-0.5 rounded">
                      ⚽+{myPrediction.scorer_bonus}
                    </span>
                  )}
                  <span className={`font-bold text-sm ${(myPrediction.points + (myPrediction.scorer_bonus ?? 0)) > 0 ? 'text-[#22c55e]' : 'text-c-muted'}`}>
                    +{myPrediction.points + (myPrediction.scorer_bonus ?? 0)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <TeamFlag flagEmoji={match.away_flag} size="xl" />
              <span className="font-bold text-c-text text-center text-sm">{match.away_name_he}</span>
            </div>
          </div>
        )}

        {/* Channel */}
        {(match.channel_name || match.channel_logo) && (
          <div className="flex justify-center mt-3">
            {match.channel_logo
              ? <img src={themedLogo(match.channel_logo, theme)} alt={match.channel_name} className="h-4 object-contain opacity-60" />
              : <span className="text-c-muted text-xs">{match.channel_name}</span>}
          </div>
        )}

        {/* Betting controls — only when open */}
        {!locked && !matchStarted && (
          <>
            <div className="border-t border-c-border mt-4 pt-4">
              {/* Double toggle */}
              <button
                onClick={() => { if (doubleUsed && !useDouble) return; setUseDouble(d => !d); }}
                disabled={doubleUsed && !useDouble}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border mb-4 transition-colors ${
                  useDouble ? 'border-[#eab308] bg-[#eab30815]'
                  : doubleUsed ? 'border-c-border bg-c-nav opacity-40 cursor-not-allowed'
                  : 'border-c-border bg-c-nav'}`}
              >
                <div className="text-right">
                  <div className={`font-bold text-sm ${useDouble ? 'text-[#eab308]' : 'text-c-text'}`}>הכפל נקודות ×2</div>
                  <div className="text-c-muted text-xs mt-0.5">
                    {doubleUsed && !useDouble ? 'כבר השתמשת בהכפלה לשלב זה' : 'השתמש בהכפלה למשחק זה'}
                  </div>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors relative ${useDouble ? 'bg-[#eab308]' : 'bg-c-border'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${useDouble ? 'right-0.5' : 'left-0.5'}`} />
                </div>
              </button>

              {saveError && <p className="text-[#b91c1c] text-sm text-center mb-3">{saveError}</p>}
              {saveSuccess ? (
                <div className="bg-[#22c55e20] border border-[#22c55e] rounded-xl py-3 text-center">
                  <span className="text-[#22c55e] font-bold">✓ התחזית נשמרה!</span>
                </div>
              ) : (
                <button onClick={handleSave} disabled={saving} className="btn-orange disabled:opacity-50">
                  {saving ? 'שומר...' : myPrediction ? 'עדכן תחזית' : 'שמור תחזית'}
                </button>
              )}
            </div>
          </>
        )}

        {/* Locked but not started */}
        {locked && !matchStarted && !myPrediction && (
          <div className="text-center mt-4 text-c-subtle text-sm">🔒 הגשת תחזיות נעולה · לא הוגשה תחזית</div>
        )}
      </div>

      {/* Injuries / missing players */}
      {!locked && injuries && (injuries.home.length > 0 || injuries.away.length > 0) && (
        <div className="bg-c-card rounded-2xl border border-c-border p-4 mb-4">
          <h2 className="font-bold text-c-text text-sm mb-3">לא בסגל</h2>
          <div className="flex gap-3">
            <div className="flex-1">
              {injuries.home.map((p, i) => (
                <div key={i} className="flex items-center gap-1.5 mb-1.5">
                  <InjuryAvatar photo={p.photo} name={p.name} />
                  <span className="text-xs text-c-muted truncate leading-tight">{p.name}</span>
                </div>
              ))}
            </div>
            <div className="w-px bg-c-border" />
            <div className="flex-1">
              {injuries.away.map((p, i) => (
                <div key={i} className="flex items-center gap-1.5 mb-1.5 flex-row-reverse">
                  <InjuryAvatar photo={p.photo} name={p.name} />
                  <span className="text-xs text-c-muted truncate leading-tight text-right">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live events */}
      {(match.status === 'live' || match.status === 'finished') && events.length > 0 && (
        <div className="bg-c-card rounded-2xl border border-c-border p-4 mb-4">
          <h2 className="font-bold text-c-text mb-3 text-sm">
            {match.status === 'live' ? '🔴 אירועי המשחק' : '📋 סיכום אירועים'}
          </h2>
          <div className="divide-y divide-c-border">
            {displayEvents.map(ev => (
              <EventRow key={ev.id} ev={ev} homeTeamId={match.home_team_id} />
            ))}
          </div>
        </div>
      )}

      {/* All predictions (the final reveals only after full tournament finalization) */}
      {predictionsRevealed && allPredictions.length > 0 && (
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
                <div className="flex items-center gap-2">
                  <span className="text-[#9333ea] font-bold">{pred.home_score} - {pred.away_score}</span>
                  {(pred.scorer_bonus ?? 0) > 0 && (
                    <span className="text-[#f97316] text-xs font-bold bg-[#f9731620] px-1.5 py-0.5 rounded">⚽+{pred.scorer_bonus}</span>
                  )}
                  <span className={`text-sm font-bold w-8 text-left ${
                    (pred.points ?? 0) + (pred.scorer_bonus ?? 0) > 0 ? 'text-[#22c55e]' : 'text-c-subtle'
                  }`}>
                    {getPointLabel((pred.points ?? 0) + (pred.scorer_bonus ?? 0))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {predictionsRevealed && allPredictions.length === 0 && (
        <div className="bg-c-card rounded-2xl border border-c-border p-5 text-center text-c-muted">
          <p>אין תחזיות למשחק זה</p>
        </div>
      )}

      {match.stage === 'final' && matchStarted && !predictionsRevealed && (
        <div className="bg-c-card rounded-2xl border border-c-border p-5 text-center text-c-muted">
          <div className="text-3xl mb-2">🔒</div>
          <p>תחזיות הגמר ייחשפו לאחר חישוב התוצאה והטבלה הסופית</p>
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
                <th className="pb-2 font-bold text-center w-8 text-[#9333ea]">נק׳</th>
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
                    <td className={`py-2 text-center font-bold ${isPlaying ? 'text-[#9333ea]' : 'text-c-text'}`}>{team.pts}</td>
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
