'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatIsraelDate, formatIsraelTime, isMatchLocked, isWithin60Minutes, isToday } from '@/lib/time';
import TeamFlag from '@/components/TeamFlag';
import { useThemeStore } from '@/stores/themeStore';

function themedLogo(url: string, theme: string) {
  if (theme === 'light' && url.startsWith('/icons/') && url.endsWith('.png')) {
    return url.replace('.png', '_l.png');
  }
  return url;
}

interface MatchRow {
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
  score_90_home: number | null;
  score_90_away: number | null;
  pen_home: number | null;
  pen_away: number | null;
  venue_name: string;
  venue_city: string;
  venue_country: string;
  channel_name: string;
  channel_logo: string;
  pred_home: number | null;
  pred_away: number | null;
  pred_double: boolean;
  pred_points: number | null;
  scorer_bonus: number | null;
  sagi_home: number | null;
  sagi_away: number | null;
  elapsed: number | null;
}

const STAGE_ORDER = ['group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'];

const STAGE_LABELS: Record<string, string> = {
  group: 'שלב הבתים',
  round_of_32: 'סבב 32',
  round_of_16: 'שמינית גמר',
  quarter_final: 'רבע גמר',
  semi_final: 'חצי גמר',
  third_place: 'מקום שלישי',
  final: 'גמר',
};

function StatusBadge({ status, elapsed }: { status: string; elapsed?: number | null }) {
  if (status === 'live') return (
    <span className="bg-[#22c55e] text-black text-xs font-bold px-2 py-0.5 rounded-full uppercase animate-pulse">
      {elapsed != null ? `${elapsed}′` : 'חי'}
    </span>
  );
  if (status === 'finished') return (
    <span className="bg-c-border text-c-muted text-xs font-bold px-2 py-0.5 rounded-full uppercase">
      סיים
    </span>
  );
  return (
    <span className="bg-c-input text-c-muted text-xs font-bold px-2 py-0.5 rounded-full uppercase">
      מתוכנן
    </span>
  );
}

function MatchCard({ match }: { match: MatchRow }) {
  const { theme } = useThemeStore();
  const locked = isMatchLocked(match.match_date);
  const urgent = isWithin60Minutes(match.match_date);
  const started = match.status === 'live' || match.status === 'finished';
  const today = isToday(match.match_date);
  const hasPred = match.pred_home !== null;

  return (
    <Link href={`/matches/${match.id}`}>
      <div className={`bg-c-card rounded-2xl border p-4 mb-3 active:opacity-80 transition-opacity ${today && !started ? 'card-today' : 'border-c-border'}`}>
        {/* Top row: date/time + status */}
        <div className="flex justify-between items-center mb-3">
          <div className="text-c-muted text-sm">
            {formatIsraelDate(match.match_date)} · {formatIsraelTime(match.match_date)}
          </div>
          <StatusBadge status={match.status} elapsed={match.elapsed} />
        </div>

        {/* Teams + score */}
        <div className="flex items-center justify-between mb-3">
          {/* Home team */}
          <div className="flex-1 flex flex-col items-center gap-1">
            <TeamFlag flagEmoji={match.home_flag} size="lg" />
            <span className="text-sm font-bold text-c-text text-center leading-tight">
              {match.home_name_he || '—'}
            </span>
          </div>

          {/* Score / vs */}
          <div className="flex-shrink-0 mx-3 text-center">
            {started && match.home_score !== null ? (
              <div className="flex flex-col items-center gap-0.5">
                <div className="text-2xl font-bold text-c-text">
                  {match.home_score} - {match.away_score}
                </div>
                {match.pen_home != null && (
                  <span className="text-xs text-[#9333ea] font-semibold">({match.pen_home}-{match.pen_away} ע״ב)</span>
                )}
                {match.score_90_home != null && match.pen_home == null && (
                  <span className="text-xs text-c-muted">הארכה</span>
                )}
              </div>
            ) : (
              <div className="text-c-muted font-bold text-lg">נגד</div>
            )}
            <div className="text-c-subtle text-xs mt-1">
              {match.stage === 'group' ? (match.group_letter ? `בית ${match.group_letter.charCodeAt(0) - 64}` : 'שלב הבתים') : STAGE_LABELS[match.stage] || match.stage}
            </div>
          </div>

          {/* Away team */}
          <div className="flex-1 flex flex-col items-center gap-1">
            <TeamFlag flagEmoji={match.away_flag} size="lg" />
            <span className="text-sm font-bold text-c-text text-center leading-tight">
              {match.away_name_he || '—'}
            </span>
          </div>
        </div>

        {/* Venue + channel */}
        {(match.venue_city || match.channel_name || match.channel_logo) && (
          <div className="flex justify-between items-center text-xs text-c-subtle mb-3">
            <span>{match.venue_name ? `${match.venue_name}, ` : ''}{match.venue_city}{match.venue_country ? `, ${match.venue_country}` : ''}</span>
            {match.channel_logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={themedLogo(match.channel_logo, theme)} alt={match.channel_name} className="h-3.5 object-contain opacity-70" />
            ) : match.channel_name ? (
              <span className="text-c-muted">{match.channel_name}</span>
            ) : null}
          </div>
        )}

        {/* Sagi's recommendation */}
        {match.sagi_home !== null && match.sagi_away !== null && (
          <div className="flex items-center gap-2 mb-3 bg-c-input rounded-xl px-3 py-1 overflow-visible">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sagi.png" alt="שגיא" className="w-14 h-14 object-contain shrink-0 -my-2" />
            <span className="text-c-muted text-xs">ההמלצה של שגיא:</span>
            <span className="font-bold text-c-text text-sm">{match.sagi_home} – {match.sagi_away}</span>
          </div>
        )}

        {/* Prediction area */}
        <div className="border-t border-c-border pt-3">
          {hasPred ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-c-muted text-sm">התחזית שלי:</span>
                <span className="text-[#9333ea] font-bold text-lg">
                  {match.pred_home} - {match.pred_away}
                </span>
                {match.pred_double && (
                  <span className="text-[#eab308] text-xs font-bold bg-[#eab30820] px-1.5 py-0.5 rounded">×2</span>
                )}
              </div>
              {match.pred_points !== null && (() => {
                const bonus = match.scorer_bonus ?? 0;
                const total = match.pred_points + bonus;
                return (
                  <div className="flex items-center gap-1.5">
                    {bonus > 0 && (
                      <span className="text-[#f97316] text-xs font-bold bg-[#f9731620] px-1.5 py-0.5 rounded">
                        ⚽+{bonus}
                      </span>
                    )}
                    <span className={`font-bold text-sm ${total > 0 ? 'text-[#22c55e]' : 'text-c-muted'}`}>
                      {total > 0 ? `+${total}` : '+0'}
                    </span>
                  </div>
                );
              })()}
            </div>
          ) : locked ? (
            <div className="text-c-subtle text-sm text-center">נעול – לא הוגשה תחזית</div>
          ) : urgent ? (
            <div className="btn-orange py-2.5 text-sm">⚡ הגש תחזית</div>
          ) : (
            <div className="btn-orange py-2.5 text-sm">הגש תחזית</div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const firstUpcomingRef = useRef<HTMLDivElement | null>(null);
  const searchParams = useSearchParams();
  const focusId = searchParams.get('focus') ?? (typeof window !== 'undefined' ? sessionStorage.getItem('lastMatchId') : null);

  useEffect(() => {
    fetch('/api/matches')
      .then(r => r.json())
      .then(data => {
        setMatches(data.matches || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Scroll to focused match (after saving a bet) or first upcoming
  useEffect(() => {
    if (loading) return;
    if (focusId) {
      const el = document.getElementById(`match-${focusId}`);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        // Pulse highlight only when coming from a save (URL param), not plain back nav
        if (searchParams.get('focus')) {
          el.classList.add('ring-2', 'ring-[#9333ea]', 'ring-offset-2', 'ring-offset-c-bg');
          setTimeout(() => el.classList.remove('ring-2', 'ring-[#9333ea]', 'ring-offset-2', 'ring-offset-c-bg'), 1500);
        }
        sessionStorage.removeItem('lastMatchId');
        return;
      }
    }
    if (firstUpcomingRef.current) {
      firstUpcomingRef.current.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, [loading, focusId, searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#9333ea] text-4xl animate-spin">⚽</div>
      </div>
    );
  }

  // Group matches by stage, preserving order
  const grouped = STAGE_ORDER.reduce<Record<string, MatchRow[]>>((acc, stage) => {
    const stageMatches = matches.filter(m => m.stage === stage);
    if (stageMatches.length > 0) acc[stage] = stageMatches;
    return acc;
  }, {});

  let firstUpcomingSet = false;

  return (
    <div>
      {matches.length === 0 ? (
        <div className="text-center text-c-muted py-12">
          <div className="text-4xl mb-3">📅</div>
          <p>אין משחקים עדיין</p>
          <p className="text-sm mt-1">המנהל יסנכרן בקרוב</p>
        </div>
      ) : (
        Object.entries(grouped).map(([stage, stageMatches]) => (
          <div key={stage}>
            {/* Sticky round header */}
            <div className="sticky top-0 z-10 bg-c-bg px-4 py-2 border-b border-c-border">
              <span className="text-xs font-bold text-[#9333ea] uppercase tracking-wider">
                {STAGE_LABELS[stage] || stage}
              </span>
            </div>

            <div className="p-4 pt-3">
              {stageMatches.map(m => {
                const isUpcoming = m.status === 'live' || (m.status === 'scheduled' && new Date(m.match_date) > new Date());
                let ref: React.RefCallback<HTMLDivElement> | undefined;
                if (isUpcoming && !firstUpcomingSet) {
                  firstUpcomingSet = true;
                  ref = (el) => { firstUpcomingRef.current = el; };
                }
                return (
                  <div key={m.id} id={`match-${m.id}`} ref={ref} className="rounded-2xl transition-shadow duration-500">
                    <MatchCard match={m} />
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
