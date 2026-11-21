/**
 * Formats a UTC ISO timestamp into human-friendly local date & time strings:
 * - "Today · 11:15 AM"
 * - "Yesterday · 8:30 PM"
 * - "21 November 2026 · 10:45 PM"
 */
export function formatNoteTimestamp(
  isoString: string,
  now: Date = new Date(),
  timeZone?: string,
): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const tzOptions: Intl.DateTimeFormatOptions = timeZone ? { timeZone } : {};

  const dayKey = (d: Date): string =>
    new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...tzOptions,
    }).format(d);

  const todayKey = dayKey(now);
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = dayKey(yesterdayDate);
  const targetKey = dayKey(date);

  const timeFormatted = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...tzOptions,
  }).format(date);

  if (targetKey === todayKey) {
    return `Today · ${timeFormatted}`;
  }
  if (targetKey === yesterdayKey) {
    return `Yesterday · ${timeFormatted}`;
  }

  const dateFormatted = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...tzOptions,
  }).format(date);

  return `${dateFormatted} · ${timeFormatted}`;
}

export function formatHeaderDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(now);
}

export function toLocalDateKey(isoString: string, timeZone?: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}
