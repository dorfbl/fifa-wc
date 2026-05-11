'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/matches', label: 'משחקים', icon: '⚽' },
  { href: '/groups', label: 'בתים', icon: '🏆' },
  { href: '/leaderboard', label: 'טבלה', icon: '📊' },
  { href: '/profile', label: 'פרופיל', icon: '👤' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 right-0 left-0 z-50 bg-c-nav border-t border-c-border"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)' }}>
      <div className="flex">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 relative flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
                active ? 'text-[#f97316]' : 'text-c-muted'
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#f97316] rounded-b-full" />
              )}
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-bold">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
