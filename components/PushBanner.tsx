'use client';

import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function PushBanner() {
  const { supported, subscribed, loading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    const v = localStorage.getItem('push-banner-dismissed');
    if (v !== 'true') setDismissed(false);
  }, []);

  function dismiss() {
    localStorage.setItem('push-banner-dismissed', 'true');
    setDismissed(true);
  }

  async function handleSubscribe() {
    await subscribe();
    dismiss();
  }

  if (!supported || subscribed || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-[#f97316] px-4 py-2.5 flex items-center gap-3 shadow-lg">
      <span className="text-white text-sm font-bold flex-1">
        🔔 הפעל התראות ותקבל תזכורת שעה לפני קיקאוף
      </span>
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="bg-white text-[#f97316] text-xs font-bold px-3 py-1 rounded-full shrink-0"
      >
        {loading ? '...' : 'הפעל'}
      </button>
      <button onClick={dismiss} className="text-white opacity-80 shrink-0 text-lg leading-none">
        ✕
      </button>
    </div>
  );
}
