'use client';

import { useState } from 'react';

interface PinInputProps {
  onComplete: (pin: string) => void;
  title?: string;
  error?: string;
  loading?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export default function PinInput({ onComplete, title, error, loading }: PinInputProps) {
  const [pin, setPin] = useState('');

  const handleKey = (key: string) => {
    if (loading) return;
    if (key === '⌫') {
      setPin(p => p.slice(0, -1));
      return;
    }
    if (key === '') return;
    if (pin.length >= 4) return;

    const newPin = pin + key;
    setPin(newPin);

    if (newPin.length === 4) {
      setTimeout(() => {
        onComplete(newPin);
        setPin('');
      }, 150);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8">
      {title && (
        <h2 className="text-xl font-bold text-c-text text-center">{title}</h2>
      )}

      {/* PIN dots */}
      <div className="flex gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              i < pin.length
                ? 'bg-[#9333ea] border-[#9333ea] scale-110'
                : 'bg-transparent border-c-muted'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-[#b91c1c] text-sm font-bold text-center px-4">{error}</p>
      )}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]" dir="ltr">
        {KEYS.map((key, idx) => (
          <button
            key={idx}
            onClick={() => handleKey(key)}
            disabled={loading || key === ''}
            className={`
              h-16 rounded-2xl text-2xl font-bold transition-all duration-100 active:scale-95
              ${key === '' ? 'invisible' : ''}
              ${key === '⌫' ? 'text-c-muted bg-c-input' : 'text-c-text bg-c-input'}
              ${loading ? 'opacity-50' : 'hover:bg-[#2a2a2a]'}
            `}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}
