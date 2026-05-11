'use client';

import { useEffect, useState } from 'react';
import TeamFlag from '@/components/TeamFlag';
import { useRouter } from 'next/navigation';

interface Team {
  id: number;
  name_he: string;
  flag_emoji: string;
  group_letter: string;
}

export default function ChampionPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [current, setCurrent] = useState<{ team_id: number; name_he: string; flag_emoji: string } | null>(null);
  const [tournamentStarted, setTournamentStarted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/groups').then(r => r.json()).then(data => {
      const allTeams = Object.values(data.groups || {}).flat() as Team[];
      setTeams(allTeams.filter(t => t.name_he !== 'לא נקבע'));
    });

    fetch('/api/tournament-winner').then(r => r.json()).then(data => {
      if (data.winner) {
        setCurrent(data.winner);
        setSelected(data.winner.team_id);
      }
      setTournamentStarted(data.tournamentStarted);
    });
  }, []);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/tournament-winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'שגיאה');
      } else {
        router.push('/profile');
      }
    } catch {
      setError('שגיאת שרת');
    }
    setSaving(false);
  };

  const filtered = teams.filter(t =>
    t.name_he.includes(search) || t.group_letter?.includes(search.toUpperCase())
  );

  return (
    <div className="p-4">
      <button onClick={() => router.back()} className="text-c-muted text-sm mb-4">← חזרה</button>

      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🏆</div>
        <h1 className="text-xl font-bold text-c-text">בחר אלופת מונדיאל</h1>
        <p className="text-c-muted text-sm mt-1">8 נקודות אם תנחש נכון</p>
      </div>

      {tournamentStarted && (
        <div className="bg-[#b91c1c20] border border-[#b91c1c] rounded-xl p-3 mb-4 text-center">
          <p className="text-[#b91c1c] text-sm font-bold">הטורניר כבר התחיל – לא ניתן לשנות</p>
        </div>
      )}

      {current && (
        <div className="bg-[var(--c-card-trans)] border border-[#f97316] rounded-xl p-3 mb-4 flex items-center gap-3">
          <TeamFlag flagEmoji={current.flag_emoji} size="sm" />
          <div>
            <div className="text-xs text-c-muted">הבחירה הנוכחית שלך</div>
            <div className="font-bold text-c-text">{current.name_he}</div>
          </div>
        </div>
      )}

      {!tournamentStarted && (
        <>
          <input
            type="text"
            placeholder="חפש קבוצה..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-c-card border border-c-border rounded-xl px-4 py-3 text-c-text text-right placeholder:text-c-subtle focus:outline-none focus:border-[#f97316] mb-4"
          />

          <div className="flex flex-col gap-2 mb-6">
            {filtered.map(team => (
              <button
                key={team.id}
                onClick={() => setSelected(team.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  selected === team.id
                    ? 'border-[#f97316] bg-[#f9731615]'
                    : 'border-c-border bg-c-card'
                }`}
              >
                <TeamFlag flagEmoji={team.flag_emoji} size="sm" />
                <span className="font-bold text-c-text flex-1 text-right">{team.name_he}</span>
                {team.group_letter && (
                  <span className="text-c-subtle text-xs">בית {team.group_letter}</span>
                )}
                {selected === team.id && <span className="text-[#f97316]">✓</span>}
              </button>
            ))}
          </div>

          {error && <p className="text-[#b91c1c] text-sm text-center mb-3">{error}</p>}

          <button
            onClick={handleSave}
            disabled={!selected || saving}
            className="btn-orange disabled:opacity-50"
          >
            {saving ? 'שומר...' : 'שמור בחירה'}
          </button>
        </>
      )}
    </div>
  );
}
