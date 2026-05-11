'use client';

interface TeamFlagProps {
  flagEmoji?: string; // Now holds the flagsapi URL or emoji fallback
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
};

export default function TeamFlag({ flagEmoji, size = 'md', className = '' }: TeamFlagProps) {
  const px = SIZE_MAP[size];

  if (!flagEmoji) {
    return <span style={{ fontSize: px * 0.75, lineHeight: 1 }}>🏳️</span>;
  }

  // If it's a URL (flagsapi.com or other)
  if (flagEmoji.startsWith('http')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={flagEmoji}
        alt="flag"
        width={px}
        height={px}
        className={`object-contain rounded-sm ${className}`}
        style={{ width: px, height: 'auto', minHeight: px * 0.6 }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  // Fallback: render as emoji text
  return (
    <span style={{ fontSize: px * 0.75, lineHeight: 1 }} className={className}>
      {flagEmoji}
    </span>
  );
}
