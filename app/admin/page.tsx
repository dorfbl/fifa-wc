'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PinInput from '@/components/PinInput';

// Small flag image helper for admin (avoids importing full TeamFlag)
function FlagImg({ src }: { src?: string }) {
  if (!src?.startsWith('http')) return <span>🏳️</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={24} height={18} className="object-contain rounded-sm" />;
}

type AdminSection = null | 'users' | 'teams' | 'venues' | 'channels' | 'matches';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState<AdminSection>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/pin')
      .then(r => r.json())
      .then(d => { if (d.authed) setAuthed(true); })
      .finally(() => setChecking(false));
  }, []);

  const handlePin = async (pin: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'סיסמה שגויה');
        setLoading(false);
        return;
      }
      setAuthed(true);
    } catch {
      setError('שגיאת שרת');
    }
    setLoading(false);
  };

  if (checking) {
    return (
      <div className="min-h-dvh bg-c-bg flex items-center justify-center">
        <div className="text-[#9333ea] text-4xl animate-spin">⚽</div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-dvh bg-c-bg flex flex-col items-center justify-center p-6">
        <div className="mb-10 text-center">
          <div className="text-5xl mb-3">⚙️</div>
          <h1 className="text-xl font-bold text-c-text">פאנל ניהול</h1>
        </div>
        <div className="w-full max-w-[320px]">
          <PinInput
            title="הזן סיסמת מנהל"
            onComplete={handlePin}
            error={error}
            loading={loading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-c-bg p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-c-text">⚙️ פאנל ניהול</h1>
        <button onClick={() => router.push('/matches')} className="text-c-muted text-sm">← יציאה</button>
      </div>

      {section === null && <AdminMenu onSelect={setSection} />}
      {section === 'users' && <AdminUsers onBack={() => setSection(null)} />}
      {section === 'teams' && <AdminTeams onBack={() => setSection(null)} />}
      {section === 'venues' && <AdminVenues onBack={() => setSection(null)} />}
      {section === 'channels' && <AdminChannels onBack={() => setSection(null)} />}
      {section === 'matches' && <AdminMatches onBack={() => setSection(null)} />}
    </div>
  );
}

function AdminMenu({ onSelect }: { onSelect: (s: AdminSection) => void }) {
  const menuItems = [
    { key: 'users', label: 'ניהול שחקנים', icon: '👥', desc: 'הוסף / מחק שחקנים' },
    { key: 'teams', label: 'ניהול קבוצות', icon: '🏳️', desc: 'עדכן שמות עבריים ודגלים' },
    { key: 'venues', label: 'ניהול אצטדיונים', icon: '🏟️', desc: 'ערוך שמות בעברית' },
    { key: 'channels', label: 'ניהול ערוצים', icon: '📺', desc: 'הוסף / ערוך ערוצים' },
    { key: 'matches', label: 'ניהול משחקים', icon: '⚽', desc: 'תוצאות, ניקוד, סנכרון' },
  ] as const;

  return (
    <div className="flex flex-col gap-3">
      {menuItems.map(item => (
        <button
          key={item.key}
          onClick={() => onSelect(item.key)}
          className="bg-c-card border border-c-border rounded-2xl p-4 flex items-center gap-4 text-right w-full hover:border-[#9333ea] transition-colors"
        >
          <span className="text-3xl">{item.icon}</span>
          <div className="flex-1 text-right">
            <div className="font-bold text-c-text">{item.label}</div>
            <div className="text-c-muted text-sm">{item.desc}</div>
          </div>
          <span className="text-c-subtle">←</span>
        </button>
      ))}
    </div>
  );
}

// ---- USERS ----
function AdminUsers({ onBack }: { onBack: () => void }) {
  const [users, setUsers] = useState<{ id: number; username: string; display_name: string; is_first_login: boolean }[]>([]);
  const [form, setForm] = useState({ username: '', displayName: '', pin: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [resetTarget, setResetTarget] = useState<{ id: number; name: string } | null>(null);
  const [resetPin, setResetPin] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const loadUsers = () => {
    fetch('/api/admin/users').then(r => r.json()).then(d => {
      setUsers(d.users || []);
      setLoading(false);
    });
  };

  useEffect(() => { loadUsers(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.displayName || form.pin.length !== 4) {
      setError('כל השדות חובה (כולל PIN בן 4 ספרות)');
      return;
    }
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: form.username, displayName: form.displayName, pin: form.pin }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error || 'שגיאה'); return; }
    setForm({ username: '', displayName: '', pin: '' });
    loadUsers();
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`למחוק את ${name}?`)) return;
    await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    loadUsers();
  };

  const handleResetPin = async () => {
    if (!resetTarget) return;
    setResetError('');
    if (!/^\d{4}$/.test(resetPin)) { setResetError('PIN חייב להיות 4 ספרות'); return; }
    setResetLoading(true);
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: resetTarget.id, pin: resetPin }),
    });
    const d = await res.json();
    setResetLoading(false);
    if (!res.ok) { setResetError(d.error || 'שגיאה'); return; }
    setResetTarget(null);
    setResetPin('');
    loadUsers();
  };

  return (
    <div>
      <button onClick={onBack} className="text-c-muted text-sm mb-4">← חזרה</button>
      <h2 className="text-lg font-bold text-c-text mb-4">👥 שחקנים</h2>

      {/* Reset PIN modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
          <div className="bg-c-card border border-c-border rounded-2xl p-5 w-full max-w-xs">
            <h3 className="font-bold text-c-text mb-1">איפוס PIN</h3>
            <p className="text-c-muted text-sm mb-4">{resetTarget.name} יאלץ לשנות PIN בכניסה הבאה</p>
            <input
              placeholder="PIN חדש (4 ספרות)"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={resetPin}
              onChange={e => setResetPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="input-dark w-full mb-3 text-center text-2xl tracking-widest"
              autoFocus
            />
            {resetError && <p className="text-[#b91c1c] text-sm mb-3">{resetError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setResetTarget(null); setResetPin(''); setResetError(''); }}
                className="flex-1 py-2 rounded-xl border border-c-border text-c-muted text-sm"
              >ביטול</button>
              <button
                onClick={handleResetPin}
                disabled={resetLoading || resetPin.length !== 4}
                className="flex-1 py-2 rounded-xl bg-[#9333ea] text-white text-sm font-bold disabled:opacity-40"
              >{resetLoading ? '...' : 'אפס PIN'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add user form */}
      <form onSubmit={handleAdd} className="bg-c-card border border-c-border rounded-2xl p-4 mb-4">
        <h3 className="font-bold text-c-text mb-3">הוסף שחקן</h3>
        <div className="flex flex-col gap-3">
          <input
            placeholder="שם משתמש (באנגלית)"
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            className="input-dark"
          />
          <input
            placeholder="שם תצוגה (בעברית)"
            value={form.displayName}
            onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
            className="input-dark"
          />
          <input
            placeholder="PIN ראשוני (4 ספרות)"
            type="password"
            maxLength={4}
            value={form.pin}
            onChange={e => setForm(f => ({ ...f, pin: e.target.value }))}
            className="input-dark"
          />
          {error && <p className="text-[#b91c1c] text-sm">{error}</p>}
          <button type="submit" className="btn-orange">הוסף שחקן</button>
        </div>
      </form>

      {/* Users list */}
      {loading ? (
        <div className="text-center text-c-muted">טוען...</div>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map(u => (
            <div key={u.id} className="bg-c-card border border-c-border rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-c-text text-sm">{u.display_name}</div>
                <div className="text-c-muted text-xs">@{u.username}</div>
                {u.is_first_login && <div className="text-[#eab308] text-xs">ממתין לאיפוס PIN</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { setResetTarget({ id: u.id, name: u.display_name }); setResetPin(''); setResetError(''); }}
                  className="text-[#9333ea] text-xs font-bold border border-[#9333ea]/40 rounded-lg px-2 py-1"
                >
                  איפוס PIN
                </button>
                <button
                  onClick={() => handleDelete(u.id, u.display_name)}
                  className="text-[#b91c1c] text-xs font-bold border border-[#b91c1c]/40 rounded-lg px-2 py-1"
                >
                  מחק
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- TEAMS ----
function AdminTeams({ onBack }: { onBack: () => void }) {
  const [teams, setTeams] = useState<{ id: number; name_en: string; name_he: string; flag_emoji: string; group_letter: string; country_code: string }[]>([]);
  const [editing, setEditing] = useState<Record<number, { name_he: string; flag_emoji: string; group_letter: string; country_code: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/admin/teams').then(r => r.json()).then(d => {
      setTeams(d.teams || []);
      setLoading(false);
    });
  }, []);

  const handleSave = async (id: number) => {
    const data = editing[id];
    if (!data) return;
    setSaving(id);
    await fetch('/api/admin/teams', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    setTeams(ts => ts.map(t => t.id === id ? { ...t, ...data } : t));
    setEditing(e => { const n = { ...e }; delete n[id]; return n; });
    setSaving(null);
  };

  const getEdit = (team: typeof teams[0]) => editing[team.id] || { name_he: team.name_he, flag_emoji: team.flag_emoji, group_letter: team.group_letter, country_code: team.country_code || '' };

  if (loading) return <div className="text-center text-c-muted">טוען...</div>;

  return (
    <div>
      <button onClick={onBack} className="text-c-muted text-sm mb-4">← חזרה</button>
      <h2 className="text-lg font-bold text-c-text mb-4">🏳️ קבוצות</h2>
      <div className="flex flex-col gap-2">
        {teams.map(team => {
          const ed = getEdit(team);
          return (
            <div key={team.id} className="bg-c-card border border-c-border rounded-xl p-3">
              <div className="text-c-subtle text-xs mb-2">{team.name_en}</div>
              <div className="flex gap-2 items-center">
                <input
                  value={ed.country_code}
                  onChange={e => {
                    const cc = e.target.value.toUpperCase().slice(0, 2);
                    const flagUrl = cc.length === 2 ? `https://flagsapi.com/${cc}/flat/64.png` : '';
                    setEditing(ev => ({ ...ev, [team.id]: { ...getEdit(team), country_code: cc, flag_emoji: flagUrl } }));
                  }}
                  className="w-12 bg-c-bg border border-c-border rounded-lg px-1 py-2 text-center text-sm text-c-text uppercase"
                  placeholder="IL"
                  maxLength={2}
                />
                <input
                  value={ed.name_he}
                  onChange={e => setEditing(ev => ({ ...ev, [team.id]: { ...getEdit(team), name_he: e.target.value } }))}
                  className="flex-1 bg-c-bg border border-c-border rounded-lg px-3 py-2 text-c-text text-sm text-right"
                  placeholder="שם בעברית"
                />
                <input
                  value={ed.group_letter}
                  onChange={e => setEditing(ev => ({ ...ev, [team.id]: { ...getEdit(team), group_letter: e.target.value } }))}
                  className="w-10 bg-c-bg border border-c-border rounded-lg px-1 py-2 text-center text-sm text-c-text"
                  placeholder="A"
                  maxLength={2}
                />
                <button
                  onClick={() => handleSave(team.id)}
                  disabled={saving === team.id || !editing[team.id]}
                  className="bg-[#9333ea] text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-40"
                >
                  {saving === team.id ? '...' : 'שמור'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- VENUES ----
function AdminVenues({ onBack }: { onBack: () => void }) {
  const [venues, setVenues] = useState<{ id: number; name_he: string; city_he: string; country_he: string }[]>([]);
  const [editing, setEditing] = useState<Record<number, { name_he: string; city_he: string; country_he: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/admin/venues').then(r => r.json()).then(d => {
      setVenues(d.venues || []);
      setLoading(false);
    });
  }, []);

  const getEdit = (v: typeof venues[0]) => editing[v.id] || { name_he: v.name_he, city_he: v.city_he, country_he: v.country_he };

  const handleSave = async (id: number) => {
    const data = editing[id];
    if (!data) return;
    setSaving(id);
    await fetch('/api/admin/venues', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    setVenues(vs => vs.map(v => v.id === id ? { ...v, ...data } : v));
    setEditing(e => { const n = { ...e }; delete n[id]; return n; });
    setSaving(null);
  };

  if (loading) return <div className="text-center text-c-muted">טוען...</div>;

  return (
    <div>
      <button onClick={onBack} className="text-c-muted text-sm mb-4">← חזרה</button>
      <h2 className="text-lg font-bold text-c-text mb-4">🏟️ אצטדיונים</h2>
      <div className="flex flex-col gap-2">
        {venues.map(v => {
          const ed = getEdit(v);
          return (
            <div key={v.id} className="bg-c-card border border-c-border rounded-xl p-3">
              <div className="flex flex-col gap-2">
                <input
                  value={ed.name_he}
                  onChange={e => setEditing(ev => ({ ...ev, [v.id]: { ...getEdit(v), name_he: e.target.value } }))}
                  className="w-full bg-c-bg border border-c-border rounded-lg px-3 py-2 text-c-text text-sm text-right"
                  placeholder="שם האצטדיון"
                />
                <div className="flex gap-2">
                  <input
                    value={ed.city_he}
                    onChange={e => setEditing(ev => ({ ...ev, [v.id]: { ...getEdit(v), city_he: e.target.value } }))}
                    className="flex-1 bg-c-bg border border-c-border rounded-lg px-3 py-2 text-c-text text-sm text-right"
                    placeholder="עיר"
                  />
                  <input
                    value={ed.country_he}
                    onChange={e => setEditing(ev => ({ ...ev, [v.id]: { ...getEdit(v), country_he: e.target.value } }))}
                    className="flex-1 bg-c-bg border border-c-border rounded-lg px-3 py-2 text-c-text text-sm text-right"
                    placeholder="מדינה"
                  />
                </div>
                <button
                  onClick={() => handleSave(v.id)}
                  disabled={saving === v.id || !editing[v.id]}
                  className="bg-[#9333ea] text-white text-sm font-bold px-3 py-2 rounded-lg disabled:opacity-40"
                >
                  {saving === v.id ? 'שומר...' : 'שמור'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- CHANNELS ----
function AdminChannels({ onBack }: { onBack: () => void }) {
  const [channels, setChannels] = useState<{ id: number; name_he: string; logo_url: string }[]>([]);
  const [form, setForm] = useState({ name_he: '', logo_url: '' });
  const [error, setError] = useState('');

  const load = () => fetch('/api/admin/channels').then(r => r.json()).then(d => {
    setChannels(d.channels || []);
  });

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name_he) { setError('שם ערוץ נדרש'); return; }
    const res = await fetch('/api/admin/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    setForm({ name_he: '', logo_url: '' });
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('למחוק ערוץ זה?')) return;
    await fetch('/api/admin/channels', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  };

  return (
    <div>
      <button onClick={onBack} className="text-c-muted text-sm mb-4">← חזרה</button>
      <h2 className="text-lg font-bold text-c-text mb-4">📺 ערוצים</h2>

      <form onSubmit={handleAdd} className="bg-c-card border border-c-border rounded-2xl p-4 mb-4">
        <h3 className="font-bold text-c-text mb-3">הוסף ערוץ</h3>
        <div className="flex flex-col gap-3">
          <input
            placeholder="שם הערוץ בעברית"
            value={form.name_he}
            onChange={e => setForm(f => ({ ...f, name_he: e.target.value }))}
            className="input-dark"
          />
          <input
            placeholder="URL של לוגו (אופציונלי)"
            value={form.logo_url}
            onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
            className="input-dark"
          />
          {error && <p className="text-[#b91c1c] text-sm">{error}</p>}
          <button type="submit" className="btn-orange">הוסף</button>
        </div>
      </form>

      <div className="flex flex-col gap-2">
        {channels.map(ch => (
          <div key={ch.id} className="bg-c-card border border-c-border rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {ch.logo_url && <img src={ch.logo_url} alt={ch.name_he} className="w-8 h-8 object-contain rounded" />}
              <span className="font-bold text-c-text">{ch.name_he}</span>
            </div>
            <button onClick={() => handleDelete(ch.id)} className="text-[#b91c1c] text-sm font-bold">מחק</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- MATCHES ----
function AdminMatches({ onBack }: { onBack: () => void }) {
  const [matches, setMatches] = useState<{
    id: number;
    home_name_he: string; away_name_he: string;
    home_flag: string; away_flag: string;
    match_date: string; status: string; stage: string;
    home_score: number | null; away_score: number | null;
    channel_id: number | null; channel_name: string; channel_logo: string;
    venue_id: number | null; venue_name: string;
  }[]>([]);
  const [channels, setChannels] = useState<{ id: number; name_he: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState('');
  const [syncingPlayers, setSyncingPlayers] = useState(false);
  const [syncPlayersResult, setSyncPlayersResult] = useState('');
  const [fixtureInput, setFixtureInput] = useState('');
  const [addingFixture, setAddingFixture] = useState(false);
  const [addFixtureResult, setAddFixtureResult] = useState('');
  const [addFixtureError, setAddFixtureError] = useState('');
  const [editing, setEditing] = useState<Record<number, { home_score: string; away_score: string; status: string; channel_id: string; venue_id: string; match_date: string }>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [recalculating, setRecalculating] = useState<number | null>(null);

  const load = () => {
    Promise.all([
      fetch('/api/admin/matches').then(r => r.json()),
      fetch('/api/admin/channels').then(r => r.json()),
    ]).then(([m, c]) => {
      setMatches(m.matches || []);
      setChannels(c.channels || []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleAddFixture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixtureInput.trim()) return;
    setAddingFixture(true);
    setAddFixtureResult('');
    setAddFixtureError('');
    try {
      const res = await fetch('/api/admin/add-fixture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixtureId: parseInt(fixtureInput.trim()) }),
      });
      const d = await res.json();
      if (!res.ok) {
        setAddFixtureError(d.error || 'שגיאה');
      } else {
        setAddFixtureResult(d.message);
        setFixtureInput('');
        load();
      }
    } catch {
      setAddFixtureError('שגיאת שרת');
    }
    setAddingFixture(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult('');
    const res = await fetch('/api/admin/sync', { method: 'POST' });
    const d = await res.json();
    setSyncResult(d.success ? `סונכרנו ${d.synced} משחקים` : `שגיאה: ${d.error}`);
    setSyncing(false);
    load();
  };

  const handleSyncPlayers = async () => {
    setSyncingPlayers(true);
    setSyncPlayersResult('');
    const res = await fetch('/api/admin/sync-players', { method: 'POST' });
    const d = await res.json();
    setSyncPlayersResult(d.success ? d.message : `שגיאה: ${d.error}`);
    setSyncingPlayers(false);
  };

  const getEdit = (m: typeof matches[0]) => editing[m.id] || {
    home_score: m.home_score !== null ? String(m.home_score) : '',
    away_score: m.away_score !== null ? String(m.away_score) : '',
    status: m.status,
    channel_id: m.channel_id ? String(m.channel_id) : '',
    venue_id: m.venue_id ? String(m.venue_id) : '',
    match_date: m.match_date ? new Date(m.match_date).toISOString().slice(0, 16) : '',
  };

  const handleSave = async (id: number) => {
    const ed = editing[id];
    if (!ed) return;
    setSaving(id);
    await fetch('/api/admin/matches', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        home_score: ed.home_score !== '' ? parseInt(ed.home_score) : null,
        away_score: ed.away_score !== '' ? parseInt(ed.away_score) : null,
        status: ed.status,
        channel_id: ed.channel_id || null,
        venue_id: ed.venue_id || null,
        match_date: ed.match_date ? new Date(ed.match_date).toISOString() : null,
      }),
    });
    setSaving(null);
    load();
  };

  const handleDelete = async (id: number, label: string) => {
    if (!confirm(`למחוק את המשחק ${label}?\nהפעולה תמחק גם את הקבוצות והשחקנים שלא בשימוש.`)) return;
    setDeleting(id);
    await fetch('/api/admin/matches', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: id }),
    });
    setDeleting(null);
    load();
  };

  const handleRecalculate = async (id: number) => {
    setRecalculating(id);
    const res = await fetch('/api/admin/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: id }),
    });
    const d = await res.json();
    alert(d.success ? `עודכנו ${d.updated} תחזיות` : d.error);
    setRecalculating(null);
  };

  if (loading) return <div className="text-center text-c-muted">טוען...</div>;

  return (
    <div>
      <button onClick={onBack} className="text-c-muted text-sm mb-4">← חזרה</button>
      <h2 className="text-lg font-bold text-c-text mb-4">⚽ משחקים</h2>

      {/* Add fixture */}
      <form onSubmit={handleAddFixture} className="bg-c-card border border-c-border rounded-2xl p-4 mb-4">
        <h3 className="font-bold text-c-text mb-3 text-sm">הוסף משחק לפי Fixture ID</h3>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Fixture ID"
            value={fixtureInput}
            onChange={e => setFixtureInput(e.target.value)}
            className="flex-1 bg-c-bg border border-c-border rounded-xl px-3 py-2 text-c-text text-sm"
          />
          <button
            type="submit"
            disabled={addingFixture || !fixtureInput.trim()}
            className="bg-[#9333ea] text-white font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50"
          >
            {addingFixture ? '...' : 'הוסף'}
          </button>
        </div>
        {addFixtureResult && <p className="text-[#22c55e] text-xs mt-2 text-center">{addFixtureResult}</p>}
        {addFixtureError && <p className="text-[#b91c1c] text-xs mt-2 text-center">{addFixtureError}</p>}
      </form>

      {/* Sync buttons */}
      <button
        onClick={handleSync}
        disabled={syncing}
        className="w-full bg-c-success-bg border border-[#22c55e] rounded-xl py-3 text-[#22c55e] font-bold mb-2 disabled:opacity-50"
      >
        {syncing ? 'מסנכרן...' : '🔄 סנכרן משחקים וקבוצות'}
      </button>
      {syncResult && <p className="text-sm text-center text-[#22c55e] mb-4">{syncResult}</p>}

      <button
        onClick={handleSyncPlayers}
        disabled={syncingPlayers}
        className="w-full bg-c-success-bg border border-[#22c55e] rounded-xl py-3 text-[#22c55e] font-bold mb-2 disabled:opacity-50"
      >
        {syncingPlayers ? 'מסנכרן שחקנים...' : '👟 סנכרן שחקנים (סגל)'}
      </button>
      {syncPlayersResult && <p className="text-sm text-center text-[#22c55e] mb-4">{syncPlayersResult}</p>}

      <div className="flex flex-col gap-3">
        {matches.map(match => {
          const ed = getEdit(match);
          return (
            <div key={match.id} className="bg-c-card border border-c-border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <FlagImg src={match.home_flag} />
                <span className="text-c-text text-sm font-bold">{match.home_name_he}</span>
                <span className="text-c-subtle">נגד</span>
                <span className="text-c-text text-sm font-bold">{match.away_name_he}</span>
                <FlagImg src={match.away_flag} />
              </div>

              <div className="flex gap-2 mb-2">
                <input
                  type="datetime-local"
                  value={ed.match_date}
                  onChange={e => setEditing(ev => ({ ...ev, [match.id]: { ...getEdit(match), match_date: e.target.value } }))}
                  className="flex-1 bg-c-bg border border-c-border rounded-lg px-2 py-1.5 text-c-text text-xs"
                />
                <select
                  value={ed.status}
                  onChange={e => setEditing(ev => ({ ...ev, [match.id]: { ...getEdit(match), status: e.target.value } }))}
                  className="bg-c-bg border border-c-border rounded-lg px-2 py-1.5 text-c-text text-xs"
                >
                  <option value="scheduled">מתוכנן</option>
                  <option value="live">חי</option>
                  <option value="finished">הסתיים</option>
                </select>
              </div>

              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  value={ed.home_score}
                  onChange={e => setEditing(ev => ({ ...ev, [match.id]: { ...getEdit(match), home_score: e.target.value } }))}
                  className="w-14 bg-c-bg border border-c-border rounded-lg px-2 py-1.5 text-center text-c-text text-sm"
                  placeholder="בית"
                />
                <span className="text-c-subtle self-center">-</span>
                <input
                  type="number"
                  value={ed.away_score}
                  onChange={e => setEditing(ev => ({ ...ev, [match.id]: { ...getEdit(match), away_score: e.target.value } }))}
                  className="w-14 bg-c-bg border border-c-border rounded-lg px-2 py-1.5 text-center text-c-text text-sm"
                  placeholder="אורח"
                />
                <select
                  value={ed.channel_id}
                  onChange={e => setEditing(ev => ({ ...ev, [match.id]: { ...getEdit(match), channel_id: e.target.value } }))}
                  className="flex-1 bg-c-bg border border-c-border rounded-lg px-2 py-1.5 text-c-text text-xs"
                >
                  <option value="">ערוץ...</option>
                  {channels.map(c => <option key={c.id} value={c.id}>{c.name_he}</option>)}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSave(match.id)}
                  disabled={saving === match.id || !editing[match.id]}
                  className="flex-1 bg-[#9333ea] text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-40"
                >
                  {saving === match.id ? '...' : 'שמור'}
                </button>
                <button
                  onClick={() => handleRecalculate(match.id)}
                  disabled={recalculating === match.id}
                  className="flex-1 bg-c-success-bg border border-[#22c55e] text-[#22c55e] text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-40"
                >
                  {recalculating === match.id ? '...' : 'חשב ניקוד'}
                </button>
                <button
                  onClick={() => handleDelete(match.id, `${match.home_name_he} נגד ${match.away_name_he}`)}
                  disabled={deleting === match.id}
                  className="bg-[#b91c1c20] border border-[#b91c1c] text-[#b91c1c] text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-40"
                >
                  {deleting === match.id ? '...' : '🗑️'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
