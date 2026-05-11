'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TournamentWinnerBanner() {
  const [hasWinner, setHasWinner] = useState<boolean | null>(null);
  const [tournamentStarted, setTournamentStarted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/tournament-winner')
      .then(r => r.json())
      .then(data => {
        setHasWinner(!!data.winner);
        setTournamentStarted(data.tournamentStarted);
      })
      .catch(() => {});
  }, []);

  // If tournament started, hide banner (predictions locked)
  if (tournamentStarted || hasWinner === null || hasWinner) return null;

  return (
    <div
      onClick={() => router.push('/champion')}
      className="w-full cursor-pointer flex items-center justify-center px-4"
      style={{
        height: '42px',
        backgroundColor: '#b91c1c',
        fontSize: '13px',
        fontWeight: 700,
      }}
    >
      <span className="text-white text-center leading-tight">
        ⚠️ עדיין לא בחרת את המנצחת של המונדיאל – לחץ כאן
      </span>
    </div>
  );
}
