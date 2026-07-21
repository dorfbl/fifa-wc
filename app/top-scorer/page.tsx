'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import TeamFlag from '@/components/TeamFlag';

interface Player {
  id: number;
  api_id: number;
  name: string;
  photo_url: string | null;
  team_id: number;
  team_name_he: string;
  team_flag: string;
  group_letter: string;
}

interface CurrentPick {
  player_id: number;
  player_name: string;
  photo_url: string | null;
  team_name_he: string;
  team_flag: string;
  points: number;
}

// Mbappé, Kane, Haaland, Lautaro, Vinícius, Álvarez, Yamal, Messi, Leão, Schick
const SUGGESTED_API_IDS = [278, 184, 1100, 217, 762, 6009, 386828, 154, 22236, 794];

function PlayerAvatar({ photoUrl, name, size = 32 }: { photoUrl: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (!photoUrl || err) {
    return (
      <div
        className="rounded-full bg-c-border flex items-center justify-center shrink-0 text-c-subtle font-bold"
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl}
      alt={name}
      width={size}
      height={size}
      onError={() => setErr(true)}
      className="rounded-full object-cover shrink-0 bg-c-border"
      style={{ width: size, height: size }}
    />
  );
}

export default function TopScorerPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [current, setCurrent] = useState<CurrentPick | null>(null);
  const [tournamentStarted, setTournamentStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [openTeams, setOpenTeams] = useState<Set<number>>(new Set());
  const router = useRouter();

  const toggleTeam = (teamId: number) => {
    setOpenTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/players').then(r => r.json()),
      fetch('/api/top-scorer').then(r => r.json()),
    ]).then(([playersData, pickerData]) => {
      setPlayers(playersData.players || []);
      if (pickerData.pick) {
        setCurrent(pickerData.pick);
        setSelected(pickerData.pick.player_id);
      }
      setTournamentStarted(pickerData.tournamentStarted);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/top-scorer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: selected }),
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

  // Group players by team, filter by search
  const grouped = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = q
      ? players.filter(p => p.name.toLowerCase().includes(q) || p.team_name_he.includes(q))
      : players;

    const map = new Map<number, { team: Pick<Player, 'team_id' | 'team_name_he' | 'team_flag' | 'group_letter'>; players: Player[] }>();
    for (const p of filtered) {
      if (!map.has(p.team_id)) {
        map.set(p.team_id, {
          team: { team_id: p.team_id, team_name_he: p.team_name_he, team_flag: p.team_flag, group_letter: p.group_letter },
          players: [],
        });
      }
      map.get(p.team_id)!.players.push(p);
    }
    return Array.from(map.values());
  }, [players, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#9333ea] text-4xl animate-spin">⚽</div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <button onClick={() => router.back()} className="text-c-muted text-sm mb-4">← חזרה</button>

      <div className="text-center mb-6">
        <div className="text-4xl mb-2">👟</div>
        <h1 className="text-xl font-bold text-c-text">בחר מלך השערים</h1>
        <p className="text-c-muted text-sm mt-1">8 נקודות אם תנחש נכון</p>
      </div>

      {tournamentStarted && (
        <div className="bg-[#b91c1c20] border border-[#b91c1c] rounded-xl p-3 mb-4 text-center">
          <p className="text-[#b91c1c] text-sm font-bold">הטורניר כבר התחיל – לא ניתן לשנות</p>
        </div>
      )}

      {current && (
        <div className="bg-[var(--c-card-trans)] border border-[#9333ea] rounded-xl p-3 mb-4 flex items-center gap-3">
          <PlayerAvatar photoUrl={current.photo_url} name={current.player_name} size={40} />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-c-muted">הבחירה הנוכחית שלך</div>
            <div className="font-bold text-c-text truncate">{current.player_name}</div>
          </div>
          <TeamFlag flagEmoji={current.team_flag} size="sm" />
          {current.points > 0 && (
            <span className="text-[#22c55e] font-bold text-sm">+{current.points}</span>
          )}
        </div>
      )}

      {!tournamentStarted && (
        <>
          {players.length === 0 ? (
            <div className="text-center text-c-muted py-8">
              <p>אין שחקנים במערכת עדיין.</p>
              <p className="text-sm mt-1">המנהל צריך לסנכרן שחקנים קודם.</p>
            </div>
          ) : (
            <>
              {/* Suggestions */}
              {(() => {
                const suggestions = SUGGESTED_API_IDS
                  .map(apiId => players.find(p => p.api_id === apiId))
                  .filter(Boolean) as Player[];
                if (suggestions.length === 0) return null;
                return (
                  <div className="mb-4">
                    <p className="text-c-muted text-xs mb-2 text-right">מועמדים מובילים</p>
                    <div className="grid grid-cols-5 gap-2">
                      {suggestions.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setSelected(p.id)}
                          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-all ${
                            selected === p.id
                              ? 'border-[#9333ea] bg-[#9333ea15]'
                              : 'border-c-border bg-c-card'
                          }`}
                        >
                          <PlayerAvatar photoUrl={p.photo_url} name={p.name} size={44} />
                          <span className="text-c-text text-[10px] leading-tight text-center w-full truncate">{p.name.split(' ').pop()}</span>
                          {p.team_flag && <TeamFlag flagEmoji={p.team_flag} size="sm" />}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <input
                type="text"
                placeholder="חפש שחקן או קבוצה..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-c-card border border-c-border rounded-xl px-4 py-3 text-c-text text-right placeholder:text-c-subtle focus:outline-none focus:border-[#9333ea] mb-4"
              />

              <div className="flex flex-col gap-2 mb-6">
                {grouped.map(({ team, players: teamPlayers }) => {
                  const isOpen = search.length > 0 || openTeams.has(team.team_id);
                  const hasSelected = teamPlayers.some(p => p.id === selected);
                  return (
                    <div key={team.team_id} className="bg-c-card border border-c-border rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleTeam(team.team_id)}
                        className="w-full flex items-center gap-3 px-3 py-3 text-right"
                      >
                        <TeamFlag flagEmoji={team.team_flag} size="sm" />
                        <span className="font-bold text-c-text text-sm flex-1">{team.team_name_he}</span>
                        {team.group_letter && (
                          <span className="text-c-subtle text-xs ml-1">בית {team.group_letter}</span>
                        )}
                        {hasSelected && <span className="text-[#9333ea] text-xs font-bold">✓</span>}
                        <span className="text-c-subtle text-xs">{isOpen ? '▲' : '▼'}</span>
                      </button>
                      {isOpen && (
                        <div className="flex flex-col gap-1 px-2 pb-2 border-t border-c-border">
                          {teamPlayers.map(player => (
                            <button
                              key={player.id}
                              onClick={() => setSelected(player.id)}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-right ${
                                selected === player.id
                                  ? 'bg-[#9333ea20] border border-[#9333ea]'
                                  : 'hover:bg-c-bg'
                              }`}
                            >
                              <PlayerAvatar photoUrl={player.photo_url} name={player.name} size={32} />
                              <span className="flex-1 text-c-text text-sm">{player.name}</span>
                              {selected === player.id && <span className="text-[#9333ea] text-sm">✓</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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
        </>
      )}
    </div>
  );
}
