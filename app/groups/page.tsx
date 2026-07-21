'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TeamFlag from '@/components/TeamFlag';

interface Team {
  id: number;
  name_he: string;
  flag_emoji: string;
  group_letter: string;
  pts: number;
  w: number;
  d: number;
  l: number;
}

interface TopScorer {
  name: string;
  photo_url: string | null;
  team_name: string;
  team_flag: string;
  goals: number;
}

interface BracketMatch {
  id: number;
  stage: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  home_name: string;
  home_flag: string;
  away_name: string;
  away_flag: string;
  venue_name: string | null;
  venue_city: string | null;
  channel_name: string | null;
  channel_logo: string | null;
  score_90_home: number | null;
  score_90_away: number | null;
  pen_home: number | null;
  pen_away: number | null;
}

const STAGE_ORDER = ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'];
const STAGE_LABELS: Record<string, string> = {
  round_of_32: 'סבב 32',
  round_of_16: 'שמינית',
  quarter_final: 'רבע גמר',
  semi_final: 'חצי גמר',
  third_place: 'מקום 3',
  final: 'גמר',
};

function MatchCard({ match }: { match: BracketMatch }) {
  const finished = match.status === 'finished';
  const homeWin = finished && match.home_score !== null && match.away_score !== null && match.home_score > match.away_score;
  const awayWin = finished && match.home_score !== null && match.away_score !== null && match.away_score > match.home_score;

  const dateStr = new Date(match.match_date).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Link href={`/matches/${match.id}`}>
      <div className="bg-c-card border border-c-border rounded-2xl overflow-hidden active:scale-[0.98] transition-transform">
        {/* Home row */}
        <div className={`flex items-center gap-3 px-4 py-3 ${awayWin ? 'opacity-40' : ''}`}>
          <div className="w-7 flex items-center justify-center"><TeamFlag flagEmoji={match.home_flag} size="sm" /></div>
          <span className={`flex-1 text-sm text-right ${homeWin ? 'font-bold text-c-text' : 'text-c-muted'}`}>{match.home_name}</span>
          {finished ? (
            <div className="flex flex-col items-center w-8">
              <span className={`text-base font-bold ${homeWin ? 'text-[#9333ea]' : 'text-c-muted'}`}>
                {match.home_score}
              </span>
              {match.pen_home != null && (
                <span className="text-[10px] text-[#9333ea]">{match.pen_home}ע״ב</span>
              )}
            </div>
          ) : (
            <span className="text-xs text-c-subtle w-6 text-center">-</span>
          )}
        </div>

        {/* Divider with date + meta */}
        <div className="flex items-center gap-2 px-4 border-t border-b border-c-border bg-c-bg/30 py-1.5">
          <div className="flex-1 flex flex-col items-end gap-0.5">
            <span className="text-xs text-c-subtle">{dateStr}</span>
            {match.venue_name && (
              <span className="text-xs text-c-subtle opacity-60">{match.venue_name}{match.venue_city ? `, ${match.venue_city}` : ''}</span>
            )}
          </div>
          {match.channel_name && (
            <div className="flex items-center gap-1 shrink-0">
              {match.channel_logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={match.channel_logo} alt={match.channel_name} className="h-4 w-auto object-contain" />
              )}
              <span className="text-xs text-c-muted font-medium">{match.channel_name}</span>
            </div>
          )}
        </div>

        {/* Away row */}
        <div className={`flex items-center gap-3 px-4 py-3 ${homeWin ? 'opacity-40' : ''}`}>
          <div className="w-7 flex items-center justify-center"><TeamFlag flagEmoji={match.away_flag} size="sm" /></div>
          <span className={`flex-1 text-sm text-right ${awayWin ? 'font-bold text-c-text' : 'text-c-muted'}`}>{match.away_name}</span>
          {finished ? (
            <div className="flex flex-col items-center w-8">
              <span className={`text-base font-bold ${awayWin ? 'text-[#9333ea]' : 'text-c-muted'}`}>
                {match.away_score}
              </span>
              {match.pen_away != null && (
                <span className="text-[10px] text-[#9333ea]">{match.pen_away}ע״ב</span>
              )}
            </div>
          ) : (
            <span className="text-xs text-c-subtle w-6 text-center">-</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function GroupsPage() {
  const [tab, setTab] = useState<'groups' | 'playoff' | 'scorers'>('groups');
  const [groups, setGroups] = useState<Record<string, Team[]>>({});
  const [rounds, setRounds] = useState<Record<string, BracketMatch[]>>({});
  const [topScorers, setTopScorers] = useState<TopScorer[]>([]);
  const [activeRound, setActiveRound] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/groups').then(r => r.json()),
      fetch('/api/brackets').then(r => r.json()),
    ]).then(([groupData, bracketData]) => {
      setGroups(groupData.groups || {});
      const r: Record<string, BracketMatch[]> = bracketData.rounds || {};
      setRounds(r);
      setTopScorers(bracketData.topScorers || []);

      // Default to most advanced round with finished matches, else first available
      const availableStages = STAGE_ORDER.filter(s => r[s]?.length > 0);
      if (availableStages.length > 0) {
        const finishedStage = [...availableStages].reverse().find(s =>
          r[s].some(m => m.status === 'finished')
        );
        setActiveRound(finishedStage || availableStages[availableStages.length - 1]);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const groupLetters = Object.keys(groups).sort();
  const groupNum = (letter: string) => letter.charCodeAt(0) - 64;
  const availableStages = STAGE_ORDER.filter(s => rounds[s]?.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#9333ea] text-4xl animate-spin">⚽</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Main tab toggle */}
      <div className="flex rounded-xl border border-c-border overflow-hidden mb-4">
        <button
          onClick={() => setTab('groups')}
          className={`flex-1 py-2 text-sm font-semibold transition-colors ${tab === 'groups' ? 'bg-[#9333ea] text-white' : 'text-c-muted bg-c-card'}`}
        >
          בתים
        </button>
        <button
          onClick={() => setTab('playoff')}
          className={`flex-1 py-2 text-sm font-semibold transition-colors ${tab === 'playoff' ? 'bg-[#9333ea] text-white' : 'text-c-muted bg-c-card'} ${availableStages.length === 0 ? 'opacity-40' : ''}`}
          disabled={availableStages.length === 0}
        >
          פלייאוף
        </button>
        <button
          onClick={() => setTab('scorers')}
          className={`flex-1 py-2 text-sm font-semibold transition-colors ${tab === 'scorers' ? 'bg-[#9333ea] text-white' : 'text-c-muted bg-c-card'}`}
        >
          כובשים
        </button>
      </div>

      {/* Groups view */}
      {tab === 'groups' && (
        <>
          {groupLetters.length === 0 ? (
            <div className="p-4 text-center text-c-muted py-12">
              <div className="text-4xl mb-3">🏆</div>
              <p>הבתים יעודכנו בקרוב</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {groupLetters.map(letter => (
                <div key={letter} className="bg-c-card rounded-2xl border border-c-border overflow-hidden">
                  <div className="text-[#9333ea] font-bold text-sm px-4 pt-3 pb-2">בית {groupNum(letter)}</div>
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 px-4 pb-1 text-c-subtle text-xs font-bold border-b border-c-border">
                    <span>קבוצה</span>
                    <span className="w-6 text-center">נ</span>
                    <span className="w-6 text-center">ת</span>
                    <span className="w-6 text-center">ה</span>
                    <span className="w-8 text-center text-[#9333ea]">נק׳</span>
                  </div>
                  {(groups[letter] as Team[] || []).map((team, idx) => (
                    <div key={team.id} className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 px-4 py-2 items-center ${idx < (groups[letter] as Team[]).length - 1 ? 'border-b border-c-border' : ''}`}>
                      <div className="flex items-center gap-2">
                        <TeamFlag flagEmoji={team.flag_emoji} size="sm" />
                        <span className="text-c-text text-sm font-medium leading-tight truncate">{team.name_he}</span>
                      </div>
                      <span className="w-6 text-center text-c-muted text-sm">{team.w}</span>
                      <span className="w-6 text-center text-c-muted text-sm">{team.d}</span>
                      <span className="w-6 text-center text-c-muted text-sm">{team.l}</span>
                      <span className="w-8 text-center text-[#9333ea] font-bold text-sm">{team.pts}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Playoff view */}
      {tab === 'playoff' && (
        <>
          {availableStages.length === 0 ? (
            <div className="text-center text-c-muted py-12">
              <div className="text-4xl mb-3">🏆</div>
              <p>שלבי הנוקאאוט יתחילו בקרוב</p>
            </div>
          ) : (
            <>
              {/* Round tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                {availableStages.map(stage => (
                  <button
                    key={stage}
                    onClick={() => setActiveRound(stage)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${activeRound === stage ? 'bg-[#9333ea] text-white' : 'bg-c-card border border-c-border text-c-muted'}`}
                  >
                    {STAGE_LABELS[stage] || stage}
                  </button>
                ))}
              </div>

              {/* Match cards for active round */}
              <div className="flex flex-col gap-3">
                {(rounds[activeRound] || []).map(match => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Top scorers view */}
      {tab === 'scorers' && (
        <div className="flex flex-col gap-3">
          {topScorers.length === 0 ? (
            <div className="text-center text-c-muted py-12">
              <div className="text-4xl mb-3">⚽</div>
              <p>אין נתוני כובשים עדיין</p>
            </div>
          ) : (
            topScorers.map((scorer, idx) => (
              <div key={scorer.name + idx} className="bg-c-card border border-c-border rounded-2xl px-4 py-3 flex items-center gap-4">
                {/* Rank */}
                <div className="text-2xl w-8 text-center shrink-0">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : <span className="text-c-muted font-bold text-sm">{idx + 1}</span>}
                </div>

                {/* Photo */}
                <ScorerPhoto url={scorer.photo_url} name={scorer.name} />

                {/* Name + team */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-c-text text-sm truncate">{scorer.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={scorer.team_flag} alt={scorer.team_name} className="w-4 h-4 rounded-sm object-cover" />
                    <span className="text-xs text-c-muted">{scorer.team_name}</span>
                  </div>
                </div>

                {/* Goals */}
                <div className="text-right shrink-0">
                  <div className="text-[#9333ea] font-bold text-xl">{scorer.goals}</div>
                  <div className="text-c-subtle text-xs">שערים</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ScorerPhoto({ url, name }: { url: string | null; name: string }) {
  const [err, setErr] = useState(false);
  if (!url || err) {
    return (
      <div className="w-12 h-12 rounded-full bg-c-border flex items-center justify-center text-c-subtle font-bold text-lg shrink-0">
        {name.charAt(0)}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} className="w-12 h-12 rounded-full object-cover bg-c-border shrink-0" onError={() => setErr(true)} />
  );
}
