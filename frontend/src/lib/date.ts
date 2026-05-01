/**
 * Date utilities that are safe for all timezones.
 *
 * Key rule: new Date('YYYY-MM-DD') is parsed as UTC midnight, which resolves
 * to the *previous day* in timezones west of UTC (e.g. New York UTC-4/UTC-5).
 * Always use these helpers instead of toISOString().slice(0,10) or new Date(dateStr).
 */

/** Returns today's date as 'YYYY-MM-DD' in local time. */
export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parses a 'YYYY-MM-DD' string into a local-time Date.
 * Safe alternative to new Date('YYYY-MM-DD') which is UTC-based.
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}
