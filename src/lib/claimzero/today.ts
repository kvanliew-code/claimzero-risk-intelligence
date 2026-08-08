/**
 * Single source of "today" for the app.
 *
 * Computed once per module load in UTC so server render and client hydration
 * agree on the same string (no locale-dependent formatting, no Date.now() in
 * render). Replaces the frozen "August 6, 2026" literals (defect D-18).
 */

const NOW = new Date();

/** Midnight UTC of the current day. */
export const TODAY_UTC = new Date(
  Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth(), NOW.getUTCDate()),
);

/** ISO date, e.g. "2026-08-08". */
export const TODAY_ISO = TODAY_UTC.toISOString().slice(0, 10);

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Long form, e.g. "August 8, 2026". Locale-independent by construction. */
export function formatLongUTC(d: Date): string {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** Long form of today, e.g. "August 8, 2026". */
export const TODAY_LONG = formatLongUTC(TODAY_UTC);

/** Month and year of today, e.g. "August 2026". */
export const TODAY_MONTH_YEAR = `${MONTHS[TODAY_UTC.getUTCMonth()]} ${TODAY_UTC.getUTCFullYear()}`;

/** ISO date N days before today. */
export function isoDaysAgo(days: number): string {
  return new Date(TODAY_UTC.getTime() - days * 86400000).toISOString().slice(0, 10);
}
