import { addDays, differenceInCalendarDays } from 'date-fns';

/**
 * Trip dates are stored as plain "yyyy-MM-dd" strings — a calendar day, not a
 * moment in time — so they never shift when the device changes time zone.
 */
export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Parses "yyyy-MM-dd" as local midnight (new Date(string) would use UTC). */
export function parseISODate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export const startOfToday = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

export function nightsBetween(startDate: string, endDate: string): number {
  return Math.max(0, differenceInCalendarDays(parseISODate(endDate), parseISODate(startDate)));
}

/** Every calendar day of a trip, start and end included. */
export function daysOfTrip(startDate: string, endDate: string): string[] {
  const start = parseISODate(startDate);
  const count = nightsBetween(startDate, endDate) + 1;
  return Array.from({ length: count }, (_, index) => toISODate(addDays(start, index)));
}

/** Smart default: the next Saturday at least three days away, for a 3-day trip. */
export function defaultTripDates(today: Date): { startDate: string; endDate: string } {
  let start = addDays(today, 3);
  while (start.getDay() !== 6) start = addDays(start, 1);
  return { startDate: toISODate(start), endDate: toISODate(addDays(start, 2)) };
}

/** 0 = Sunday … 6 = Saturday, by the language's convention (Monday if unknown). */
export function weekStartsOn(language: string): number {
  try {
    const locale = new Intl.Locale(language) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const firstDay = locale.getWeekInfo?.().firstDay ?? locale.weekInfo?.firstDay;
    if (typeof firstDay === 'number') return firstDay % 7;
  } catch {
    /* fall through */
  }
  return 1;
}

/**
 * A month as rows of seven cells for a calendar grid. Cells outside the month
 * are null so the grid keeps its shape.
 */
export function monthGrid(year: number, month: number, weekStart: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() - weekStart + 7) % 7;
  const total = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: total }, (_, index) => new Date(year, month, index + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks;
}

/** "14 – 16 Jan 2027" in the user's language. */
export function formatDateRange(startDate: string, endDate: string, language: string): string {
  const formatter = new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  return startDate === endDate ? formatter.format(start) : formatter.formatRange(start, end);
}

export function formatDay(
  date: string,
  language: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(language, options).format(parseISODate(date));
}
