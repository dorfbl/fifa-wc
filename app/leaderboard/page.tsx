'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import TeamFlag from '@/components/TeamFlag';

interface LeaderboardEntry {
  user_id: number;
  display_name: string;
  total_points: number;
  exact_scores: number;
  correct_winners: number;
  success_rate: number;
  rank: number;
  champion_name?: string;
  champion_flag?: string;
  top_scorer_name?: string;
  top_scorer_photo?: string;
  top_scorer_team_flag?: string;
}

function ScorerAvatar({ photoUrl, name }: { photoUrl?: string; name?: string }) {
  const [err, setErr] = useState(false);
  if (!photoUrl || err) {
    return (
      <span className="w-5 h-5 rounded-full bg-c-border flex items-center justify-center text-[9px] text-c-subtle font-bold shrink-0">
        {name?.charAt(0)?.toUpperCase() ?? '?'}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photoUrl} alt={name ?? ''} width={20} height={20} onError={() => setErr(true)}
      className="w-5 h-5 rounded-full object-cover bg-c-border shrink-0" />
  );
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [hidden, setHidden] = useState(false);
  const [tournamentEnded] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => {
        setLeaderboard(data.leaderboard || []);
        setHidden(data.hiddenDuringFinal || false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#f97316] text-4xl animate-spin">⚽</div>
      </div>
    );
  }

  if (hidden) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-64 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-c-text mb-2">הטבלה נסתרת</h2>
        <p className="text-c-muted">הטבלה תוצג מחדש בסיום הגמר</p>
      </div>
    );
  }

  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-c-text mb-4">טבלת הניקוד</h1>

      {leaderboard.length === 0 ? (
        <div className="text-center text-c-muted py-12">
          <div className="text-4xl mb-3">📊</div>
          <p>הטבלה תתעדכן לאחר המשחק הראשון</p>
        </div>
      ) : (
        <>
          {/* Podium (only shown if tournament ended) */}
          {tournamentEnded && top3.length === 3 && (
            <div className="flex items-end justify-center gap-3 mb-6 py-4">
              {/* 2nd */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="text-3xl">🥈</div>
                <div className="text-c-text font-bold text-sm text-center">{top3[1].display_name}</div>
                <div className="bg-[#a3a3a3] w-full h-16 rounded-t-xl flex items-start justify-center pt-2">
                  <span className="text-white font-bold">{top3[1].total_points}</span>
                </div>
              </div>
              {/* 1st */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="text-4xl">🥇</div>
                <div className="text-c-text font-bold text-sm text-center">{top3[0].display_name}</div>
                <div className="bg-[#eab308] w-full h-24 rounded-t-xl flex items-start justify-center pt-2">
                  <span className="text-white font-bold">{top3[0].total_points}</span>
                </div>
              </div>
              {/* 3rd */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="text-3xl">🥉</div>
                <div className="text-c-text font-bold text-sm text-center">{top3[2].display_name}</div>
                <div className="bg-[#cd7f32] w-full h-10 rounded-t-xl flex items-start justify-center pt-2">
                  <span className="text-white font-bold">{top3[2].total_points}</span>
                </div>
              </div>
            </div>
          )}

          {/* Full list */}
          <div className="flex flex-col gap-2">
            {leaderboard.map((entry, idx) => {
              const isMe = user?.id === entry.user_id;
              return (
                <div
                  key={entry.user_id}
                  className={`bg-c-card rounded-2xl border p-4 ${
                    isMe ? 'border-[#f97316]' : 'border-c-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xl w-8 text-center">
                      {idx < 3 ? MEDALS[idx] : <span className="text-c-muted font-bold text-sm">{entry.rank}</span>}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold ${isMe ? 'text-[#f97316]' : 'text-c-text'}`}>
                          {entry.display_name}
                          {isMe && <span className="text-xs mr-1">(אני)</span>}
                        </span>
                        {entry.champion_flag && (
                          <TeamFlag flagEmoji={entry.champion_flag} size="sm" />
                        )}
                        {entry.top_scorer_photo && (
                          <ScorerAvatar photoUrl={entry.top_scorer_photo} name={entry.top_scorer_name} />
                        )}
                        {entry.top_scorer_team_flag && !entry.top_scorer_photo && (
                          <TeamFlag flagEmoji={entry.top_scorer_team_flag} size="sm" />
                        )}
                      </div>
                      <div className="flex gap-3 text-xs text-c-muted mt-1">
                        <span>✓✓ {entry.exact_scores}</span>
                        <span>✓ {entry.correct_winners}</span>
                        <span>🎯 {entry.success_rate}%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#f97316] font-bold text-xl">{entry.total_points}</div>
                      <div className="text-c-subtle text-xs">נקודות</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
