/**
 * ISO `YYYY-MM-DD` date handling. I am the only module here that touches
 * `Date`: everything else works in strings, where lexicographic order is
 * chronological order.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_LENGTH = 10;
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;
/** The average Gregorian month, for rounding a long gap to months. */
const DAYS_PER_MONTH = 30.44;
/** Past this many days, a count of days stops being easy to read. */
const DAYS_LABEL_LIMIT = 14;
/** Past this many days, a count of weeks stops being easy to read. */
const WEEKS_LABEL_LIMIT = 70;

const YEAR_DIGITS = 4;
const MONTH_DIGITS = 2;
const DAY_DIGITS = 2;

const dayLabelFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  // Dates are anchored at UTC midnight, so the formatter must read them
  // there too or it reports the previous day west of Greenwich.
  timeZone: "UTC",
});

function pad(value: number, digits: number): string {
  return String(value).padStart(digits, "0");
}

/** I anchor an ISO date at UTC midnight, where every day is 24h long. */
function toUtcMillis(iso: string): number {
  const parts = ISO_DATE.exec(iso);
  if (parts === null) {
    throw new Error(`Not an ISO date: ${iso}`);
  }
  return Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
}

function toIso(millis: number): string {
  return new Date(millis).toISOString().slice(0, ISO_DATE_LENGTH);
}

/** I return the local calendar date, the only clock read in the feature. */
export function localDate(now: Date = new Date()): string {
  const year = pad(now.getFullYear(), YEAR_DIGITS);
  const month = pad(now.getMonth() + 1, MONTH_DIGITS);
  const day = pad(now.getDate(), DAY_DIGITS);
  return `${year}-${month}-${day}`;
}

/** I return the date `days` after mine, negative counting backwards. */
export function addDays(iso: string, days: number): string {
  return toIso(toUtcMillis(iso) + days * MILLIS_PER_DAY);
}

/** I return how many days separate two dates, signed. */
export function diffDays(from: string, to: string): number {
  return (toUtcMillis(to) - toUtcMillis(from)) / MILLIS_PER_DAY;
}

/** I render a date the way a day separator shows it: "Wed, Sep 9". */
export function formatDayLabel(iso: string): string {
  return dayLabelFormat.format(toUtcMillis(iso));
}

function pluralize(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

/** I describe a run of omitted days at whatever scale reads best. */
export function formatGapLabel(days: number): string {
  if (days < DAYS_LABEL_LIMIT) {
    return pluralize(days, "day");
  }
  if (days < WEEKS_LABEL_LIMIT) {
    return pluralize(Math.round(days / DAYS_PER_WEEK), "week");
  }
  return pluralize(Math.round(days / DAYS_PER_MONTH), "month");
}
