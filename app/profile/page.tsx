'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TeamFlag from '@/components/TeamFlag';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import TakanonModal from '@/components/TakanonModal';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface ProfileData {
  display_name: string;
  total_points: number;
  rank: number | string;
  exact_scores: number;
  correct_winners: number;
  total_predictions: number;
  success_rate: number;
  group_double_available: boolean;
  knockout_double_available: boolean;
  champion: { name_he: string; flag_emoji: string; points: number } | null;
  top_scorer: { player_name: string; photo_url: string | null; team_name_he: string; team_flag: string; points: number } | null;
  tournament_started: boolean;
}

function TopScorerAvatar({ photoUrl, name }: { photoUrl: string | null; name: string }) {
  const [err, setErr] = useState(false);
  if (!photoUrl || err) {
    return (
      <div className="w-10 h-10 rounded-full bg-c-border flex items-center justify-center text-c-subtle font-bold text-sm shrink-0">
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photoUrl} alt={name} width={40} height={40} onError={() => setErr(true)}
      className="w-10 h-10 rounded-full object-cover bg-c-border shrink-0" />
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-c-card rounded-2xl border border-c-border p-4 flex flex-col items-center">
      <div className="text-[#9333ea] font-bold text-2xl">{value}</div>
      <div className="text-c-text text-sm font-bold mt-1">{label}</div>
      {sub && <div className="text-c-subtle text-xs mt-0.5">{sub}</div>}
    </div>
  );
}

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTakanon, setShowTakanon] = useState(false);
  const { logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { supported: pushSupported, subscribed: pushSubscribed, loading: pushLoading, error: pushError, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications();
  const router = useRouter();

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#9333ea] text-4xl animate-spin">⚽</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="bg-c-card rounded-2xl border border-c-border p-5 mb-4 text-center">
        <div className="flex items-center justify-between mb-2">
          <div className="w-10" />
          <div className="text-5xl">👤</div>
          <button
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-c-input text-xl"
            title={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
        <h1 className="text-2xl font-bold text-c-text">{data.display_name}</h1>
        <div className="flex items-center justify-center gap-3 mt-2">
          <span className="text-c-muted text-sm">מקום {data.rank}</span>
          {data.champion && (
            <TeamFlag flagEmoji={data.champion.flag_emoji} size="sm" />
          )}
          {data.top_scorer && (
            <TopScorerAvatar photoUrl={data.top_scorer.photo_url} name={data.top_scorer.player_name} />
          )}
        </div>
      </div>

      {/* Points big display */}
      <div className="bg-[#9333ea] rounded-2xl p-5 mb-4 text-center">
        <div className="text-5xl font-bold text-white">{data.total_points}</div>
        <div className="text-white text-sm font-bold mt-1 opacity-80">{'סה"כ נקודות'}</div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard label="ניחושים מדויקים" value={data.exact_scores} sub="3 נקודות" />
        <StatCard label="ניצחונות נכונים" value={data.correct_winners} sub="נקודה אחת" />
        <StatCard label="אחוז הצלחה" value={`${data.success_rate}%`} />
        <StatCard label="סה״כ תחזיות" value={data.total_predictions} />
      </div>

      {/* Doubles */}
      <div className="bg-c-card rounded-2xl border border-c-border p-4 mb-4">
        <h2 className="font-bold text-c-text mb-3">הכפלות</h2>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-c-muted text-sm">שלב הבתים</span>
            {data.group_double_available ? (
              <span className="text-[#22c55e] font-bold text-sm">זמינה</span>
            ) : (
              <span className="text-c-subtle text-sm">✓ שומשה</span>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-c-muted text-sm">שלב הנוק-אאוט</span>
            {data.knockout_double_available ? (
              <span className="text-[#22c55e] font-bold text-sm">זמינה</span>
            ) : (
              <span className="text-c-subtle text-sm">✓ שומשה</span>
            )}
          </div>
        </div>
      </div>

      {/* Champion pick */}
      {data.champion ? (
        <div className="bg-c-card rounded-2xl border border-c-border p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-c-text">הבחירה שלי לאלופה</h2>
            {!data.tournament_started && (
              <button
                onClick={() => router.push('/champion')}
                className="text-[#9333ea] text-sm font-bold"
              >
                שנה ✏️
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <TeamFlag flagEmoji={data.champion.flag_emoji} size="md" />
            <span className="font-bold text-c-text">{data.champion.name_he}</span>
            {data.champion.points > 0 && (
              <span className="text-[#22c55e] font-bold mr-auto">+{data.champion.points}</span>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => router.push('/champion')}
          className="btn-orange mb-4"
        >
          בחר אלופה 🏆
        </button>
      )}

      {/* Top scorer pick */}
      {data.top_scorer ? (
        <div className="bg-c-card rounded-2xl border border-c-border p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-c-text">הבחירה שלי למלך שערים</h2>
            {!data.tournament_started && (
              <button
                onClick={() => router.push('/top-scorer')}
                className="text-[#9333ea] text-sm font-bold"
              >
                שנה ✏️
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <TopScorerAvatar photoUrl={data.top_scorer.photo_url} name={data.top_scorer.player_name} />
            <span className="font-bold text-c-text flex-1">{data.top_scorer.player_name}</span>
            <TeamFlag flagEmoji={data.top_scorer.team_flag} size="sm" />
            {data.top_scorer.points > 0 && (
              <span className="text-[#22c55e] font-bold">+{data.top_scorer.points}</span>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => router.push('/top-scorer')}
          className="btn-orange mb-4"
        >
          בחר מלך שערים 👟
        </button>
      )}

      {/* Push notifications */}
      {pushSupported && (
        <button
          onClick={pushSubscribed ? pushUnsubscribe : pushSubscribe}
          disabled={pushLoading}
          className={`w-full border rounded-xl py-3 font-bold mt-2 transition-colors ${
            pushSubscribed
              ? 'bg-c-card border-[#9333ea] text-[#9333ea]'
              : 'bg-c-card border-c-border text-c-muted'
          }`}
        >
          {pushLoading ? 'מתחבר...' : pushError ? `⚠️ ${pushError}` : pushSubscribed ? '🔔 התראות פעילות' : '🔕 הפעל התראות'}
        </button>
      )}

      {/* Takanon */}
      <button
        onClick={() => setShowTakanon(true)}
        className="w-full bg-c-card border border-c-border rounded-xl py-3 text-c-muted font-bold mt-2"
      >
        📋 תקנון המשחק
      </button>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full bg-c-card border border-c-border rounded-xl py-3 text-c-muted font-bold mt-2"
      >
        התנתקות
      </button>

      {showTakanon && <TakanonModal onClose={() => setShowTakanon(false)} />}
    </div>
  );
}
