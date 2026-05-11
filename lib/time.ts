// Convert UTC to Israel time for display
export function toIsraelTime(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d;
}

export function formatIsraelDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const todayIL = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
  const matchIL = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
  if (matchIL === todayIL) return 'היום';
  return d.toLocaleDateString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function formatIsraelTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatIsraelDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isMatchLocked(matchDate: Date | string): boolean {
  const d = typeof matchDate === 'string' ? new Date(matchDate) : matchDate;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  return diffMs <= 5 * 60 * 1000; // 5 minutes before
}

export function isWithin60Minutes(matchDate: Date | string): boolean {
  const d = typeof matchDate === 'string' ? new Date(matchDate) : matchDate;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  return diffMs > 0 && diffMs <= 60 * 60 * 1000;
}

export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const todayIL = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
  const matchIL = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
  return matchIL === todayIL;
}

export function isMatchStarted(matchDate: Date | string): boolean {
  const d = typeof matchDate === 'string' ? new Date(matchDate) : matchDate;
  return new Date() >= d;
}
