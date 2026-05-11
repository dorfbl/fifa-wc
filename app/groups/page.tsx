'use client';

import { useEffect, useState } from 'react';
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

export default function GroupsPage() {
  const [groups, setGroups] = useState<Record<string, Team[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/groups')
      .then(r => r.json())
      .then(data => {
        setGroups(data.groups || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const groupLetters = Object.keys(groups).sort();
  const groupNum = (letter: string) => letter.charCodeAt(0) - 64;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#f97316] text-4xl animate-spin">⚽</div>
      </div>
    );
  }

  if (groupLetters.length === 0) {
    return (
      <div className="p-4 text-center text-c-muted py-12">
        <div className="text-4xl mb-3">🏆</div>
        <p>הבתים יעודכנו בקרוב</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-c-text mb-4 text-right">בתים</h1>

      <div className="flex flex-col gap-4">
        {groupLetters.map(letter => (
          <div key={letter} className="bg-c-card rounded-2xl border border-c-border overflow-hidden">
            <div className="text-[#f97316] font-bold text-sm px-4 pt-3 pb-2">בית {groupNum(letter)}</div>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 px-4 pb-1 text-c-subtle text-xs font-bold border-b border-c-border">
              <span>קבוצה</span>
              <span className="w-6 text-center">נ</span>
              <span className="w-6 text-center">ת</span>
              <span className="w-6 text-center">ה</span>
              <span className="w-8 text-center text-[#f97316]">נק׳</span>
            </div>
            {/* Rows */}
            {(groups[letter] as Team[] || []).map((team, idx) => (
              <div key={team.id} className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 px-4 py-2 items-center ${idx < (groups[letter] as Team[]).length - 1 ? 'border-b border-c-border' : ''}`}>
                <div className="flex items-center gap-2">
                  <TeamFlag flagEmoji={team.flag_emoji} size="sm" />
                  <span className="text-c-text text-sm font-medium leading-tight truncate">{team.name_he}</span>
                </div>
                <span className="w-6 text-center text-c-muted text-sm">{team.w}</span>
                <span className="w-6 text-center text-c-muted text-sm">{team.d}</span>
                <span className="w-6 text-center text-c-muted text-sm">{team.l}</span>
                <span className="w-8 text-center text-[#f97316] font-bold text-sm">{team.pts}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
