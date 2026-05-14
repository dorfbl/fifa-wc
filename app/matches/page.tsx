'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
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
  venue_name: string;
  venue_city: string;
  venue_country: string;
  channel_name: string;
  channel_logo: string;
  pred_home: number | null;
  pred_away: number | null;
  pred_double: boolean;
  pred_points: number | null;
  sagi_home: number | null;
  sagi_away: number | null;
}

const STAGE_LABELS: Record<string, string> = {
  group: 'בית',
  round_of_32: 'סבב 32',
  round_of_16: 'שמינית גמר',
  quarter_final: 'רבע גמר',
  semi_final: 'חצי גמר',
  final: 'גמר',
};

function StatusBadge({ status }: { status: string }) {
  if (status === 'live') return (
    <span className="bg-[#22c55e] text-black text-xs font-bold px-2 py-0.5 rounded-full uppercase animate-pulse">
      חי
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
          <StatusBadge status={match.status} />
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
              <div className="text-2xl font-bold text-c-text">
                {match.home_score} - {match.away_score}
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
                <span className="text-[#f97316] font-bold text-lg">
                  {match.pred_home} - {match.pred_away}
                </span>
                {match.pred_double && (
                  <span className="text-[#eab308] text-xs font-bold bg-[#eab30820] px-1.5 py-0.5 rounded">×2</span>
                )}
              </div>
              {match.pred_points !== null && (
                <span className={`font-bold text-sm ${match.pred_points > 0 ? 'text-[#22c55e]' : 'text-c-muted'}`}>
                  {match.pred_points > 0 ? `+${match.pred_points}` : '+0'}
                </span>
              )}
            </div>
          ) : locked ? (
            <div className="text-c-subtle text-sm text-center">נעול – לא הוגשה תחזית</div>
          ) : urgent ? (
            <div className="bg-[#f97316] rounded-xl px-4 py-2.5 text-center">
              <span className="text-white font-bold text-sm">הזדמנות אחרונה – הגש תחזית</span>
            </div>
          ) : (
            <div className="bg-[#f97316] rounded-xl px-4 py-2.5 text-center">
              <span className="text-white font-bold text-sm">הגש תחזית עכשיו</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const nextMatchRef = useRef<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/matches?page=${page}`)
      .then(r => r.json())
      .then(data => {
        setMatches(data.matches || []);
        setTotalPages(data.totalPages || 1);

        // Find next upcoming match (first not finished/live)
        const now = new Date();
        const upcoming = (data.matches || []).findIndex(
          (m: MatchRow) => new Date(m.match_date) > now && m.status === 'scheduled'
        );
        nextMatchRef.current = upcoming;
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#f97316] text-4xl animate-spin">⚽</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-c-text mb-4">משחקים</h1>

      {matches.length === 0 ? (
        <div className="text-center text-c-muted py-12">
          <div className="text-4xl mb-3">📅</div>
          <p>אין משחקים עדיין</p>
          <p className="text-sm mt-1">המנהל יסנכרן בקרוב</p>
        </div>
      ) : (
        matches.map(m => <MatchCard key={m.id} match={m} />)
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 gap-3">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex-1 bg-c-card border border-c-border rounded-xl py-3 text-c-text font-bold disabled:opacity-40"
          >
            ← הקודם
          </button>
          <span className="text-c-muted text-sm whitespace-nowrap">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex-1 bg-c-card border border-c-border rounded-xl py-3 text-c-text font-bold disabled:opacity-40"
          >
            הבא →
          </button>
        </div>
      )}
    </div>
  );
}
