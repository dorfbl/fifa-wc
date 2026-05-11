'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PinInput from '@/components/PinInput';
import { useAuthStore } from '@/stores/authStore';

export default function ChangePinPage() {
  const [step, setStep] = useState<'new' | 'confirm'>('new');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser, user } = useAuthStore();

  const handleNewPin = (pin: string) => {
    setNewPin(pin);
    setStep('confirm');
    setError('');
  };

  const handleConfirm = async (pin: string) => {
    if (pin !== newPin) {
      setError('הסיסמאות לא תואמות. נסה שוב.');
      setStep('new');
      setNewPin('');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPin: pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'שגיאה');
        setLoading(false);
        return;
      }
      if (user) setUser({ ...user, is_first_login: false });
      router.replace('/matches');
    } catch {
      setError('שגיאת שרת');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-c-bg flex flex-col items-center justify-center p-6">
      <div className="mb-10 text-center">
        <div className="text-5xl mb-3">🔐</div>
        <h1 className="text-xl font-bold text-c-text">ברוך הבא!</h1>
        <p className="text-c-muted text-sm mt-1">יש לבחור סיסמה אישית</p>
      </div>

      <div className="w-full max-w-[320px]">
        <PinInput
          title={step === 'new' ? 'בחר סיסמה חדשה בת 4 ספרות' : 'אמת את הסיסמה'}
          onComplete={step === 'new' ? handleNewPin : handleConfirm}
          error={error}
          loading={loading}
        />
      </div>
    </div>
  );
}
