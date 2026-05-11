'use client';

import { useState, useEffect } from 'react';

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setSupported(true);
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      }).catch(() => {/* ignore */});
    }
  }, []);

  async function subscribe() {
    setLoading(true);
    setError(null);
    try {
      // Request permission explicitly first
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('יש לאפשר התראות בדפדפן');
        return;
      }

      const keyRes = await fetch('/api/push/vapid-key');
      const { publicKey } = await keyRes.json();

      // Get or register SW — only unregister if broken
      let reg: ServiceWorkerRegistration;
      try {
        await navigator.serviceWorker.register('/sw.js');
        reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ]);
      } catch {
        // SW broken — unregister all and retry once
        const existing = await navigator.serviceWorker.getRegistrations();
        await Promise.all(existing.map(r => r.unregister()));
        await navigator.serviceWorker.register('/sw.js');
        reg = await navigator.serviceWorker.ready;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = sub.toJSON();
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });

      if (!res.ok) throw new Error('Server error');
      setSubscribed(true);
    } catch (e) {
      console.error('Push subscribe failed', e);
      setError('שגיאה בהפעלת התראות');
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {
      console.error('Push unsubscribe failed', e);
    } finally {
      setLoading(false);
    }
  }

  return { supported, subscribed, loading, error, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(Array.from(raw).map((c) => c.charCodeAt(0)));
}
