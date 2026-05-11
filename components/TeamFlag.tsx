'use client';

import { useState } from 'react';

interface TeamFlagProps {
  flagEmoji?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = { sm: 24, md: 32, lg: 48, xl: 64 };

function urlToEmoji(url: string): string {
  const match = url.match(/flagsapi\.com\/([A-Z]{2})\//);
  if (!match) return '🏳️';
  const [a, b] = match[1].split('');
  return String.fromCodePoint(0x1F1E6 + a.charCodeAt(0) - 65) +
         String.fromCodePoint(0x1F1E6 + b.charCodeAt(0) - 65);
}

export default function TeamFlag({ flagEmoji, size = 'md', className = '' }: TeamFlagProps) {
  const [retries, setRetries] = useState(0);
  const [failed, setFailed] = useState(false);
  const px = SIZE_MAP[size];

  if (!flagEmoji) {
    return <span style={{ fontSize: px * 0.75, lineHeight: 1 }}>🏳️</span>;
  }

  if (flagEmoji.startsWith('http')) {
    if (failed) {
      return (
        <span style={{ fontSize: px * 0.75, lineHeight: 1 }} className={className}>
          {urlToEmoji(flagEmoji)}
        </span>
      );
    }

    const src = retries > 0 ? `${flagEmoji}?r=${retries}` : flagEmoji;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt="flag"
        width={px}
        height={px}
        loading="eager"
        className={`object-contain rounded-sm ${className}`}
        style={{ width: px, height: 'auto', minHeight: px * 0.6 }}
        onError={() => {
          if (retries < 2) setRetries(r => r + 1);
          else setFailed(true);
        }}
      />
    );
  }

  return (
    <span style={{ fontSize: px * 0.75, lineHeight: 1 }} className={className}>
      {flagEmoji}
    </span>
  );
}
