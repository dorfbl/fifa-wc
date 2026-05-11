'use client';

import { useEffect } from 'react';

export default function ServiceWorkerInit() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        reg.update().catch(() => {/* ignore update errors */});
      }).catch(console.error);
    }
  }, []);
  return null;
}
