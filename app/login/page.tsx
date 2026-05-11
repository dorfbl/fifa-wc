'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PinInput from '@/components/PinInput';
import { useAuthStore } from '@/stores/authStore';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [step, setStep] = useState<'username' | 'pin'>('username');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useAuthStore();

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setError('');
    setStep('pin');
  };

  const handlePinComplete = async (pin: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'שגיאת התחברות');
        setLoading(false);
        return;
      }
      setUser(data.user);
      if (data.user.is_first_login) {
        router.replace('/change-pin');
      } else {
        router.replace('/matches');
      }
    } catch {
      setError('שגיאת שרת');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-c-bg flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-12 text-center">
        <div className="text-6xl mb-4">⚽</div>
        <h1 className="text-2xl font-bold text-c-text">מונדיאל חברים 2026</h1>
        <p className="text-c-muted text-sm mt-1">משחק ניחושים פרטי</p>
      </div>

      {step === 'username' ? (
        <form onSubmit={handleUsernameSubmit} className="w-full max-w-[320px] flex flex-col gap-4">
          <div>
            <label className="block text-c-muted text-sm font-bold mb-2">שם משתמש</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="הזן שם משתמש"
              autoComplete="username"
              autoFocus
              className="w-full bg-c-card border border-c-border rounded-xl px-4 py-4 text-c-text text-lg text-right placeholder:text-c-subtle focus:outline-none focus:border-[#f97316] transition-colors"
            />
          </div>
          {error && <p className="text-[#b91c1c] text-sm font-bold text-center">{error}</p>}
          <button
            type="submit"
            className="btn-orange"
            disabled={!username.trim()}
          >
            המשך
          </button>
        </form>
      ) : (
        <div className="w-full max-w-[320px]">
          <button
            onClick={() => { setStep('username'); setError(''); }}
            className="text-c-muted text-sm mb-6 flex items-center gap-1"
          >
            → <span className="underline">{username}</span>
          </button>
          <PinInput
            title="הזן סיסמה בת 4 ספרות"
            onComplete={handlePinComplete}
            error={error}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}
