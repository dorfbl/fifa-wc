'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from './BottomNav';
import TournamentWinnerBanner from './TournamentWinnerBanner';
import { useAuthStore } from '@/stores/authStore';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, fetchUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    } else if (!loading && user?.is_first_login) {
      router.replace('/change-pin');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-c-bg">
        <div className="text-[#9333ea] text-4xl animate-spin">⚽</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-dvh bg-c-bg flex flex-col">
      <TournamentWinnerBanner />
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
