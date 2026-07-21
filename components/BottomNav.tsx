'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  {
    href: '/matches',
    label: 'משחקים',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 0 1 6.9 2.77M12 2a10 10 0 0 0-6.9 2.77M12 22a10 10 0 0 0 6.9-2.77M12 22a10 10 0 0 1-6.9-2.77M2 12h3m14 0h3M12 2v3m0 14v3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8l2.5 1.8L13.5 13h-3l-1-3.2L12 8z" />
      </svg>
    ),
  },
  {
    href: '/groups',
    label: 'בתים',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/leaderboard',
    label: 'טבלה',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 18h3v-6H3v6zm5 0h3V6H8v12zm5 0h3V9h-3v9zm5 0h3v-3h-3v3z" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'פרופיל',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0zM4.5 20.25a8.25 8.25 0 0 1 15 0" />
      </svg>
    ),
  },
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
                active ? 'text-[#9333ea]' : 'text-c-muted'
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#9333ea] rounded-b-full" />
              )}
              {tab.icon}
              <span className="text-xs font-bold">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
