const DAY_MS = 24 * 60 * 60 * 1000;

export type CountdownStatus = "upcoming" | "tomorrow" | "departure" | "underway";

export type DepartureCountdown = {
  days: number;
  label: string;
  status: CountdownStatus;
};

type LocalDateParts = { year: number; month: number; day: number };

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function localDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseLocalDate(value: string): LocalDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(year, month - 1, day, 12);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function isValidLocalDate(value: string): boolean {
  return parseLocalDate(value) !== null;
}

export function addLocalCalendarDays(date: Date, days: number): string {
  const result = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    12,
  );
  return localDateString(result);
}

export function calendarDayDifference(later: string, earlier: string): number {
  const laterParts = parseLocalDate(later);
  const earlierParts = parseLocalDate(earlier);
  if (!laterParts || !earlierParts) return 0;

  const laterUtc = Date.UTC(laterParts.year, laterParts.month - 1, laterParts.day);
  const earlierUtc = Date.UTC(earlierParts.year, earlierParts.month - 1, earlierParts.day);
  return Math.round((laterUtc - earlierUtc) / DAY_MS);
}

export function departureCountdown(
  departureDate: string,
  today = localDateString(new Date()),
): DepartureCountdown {
  const days = calendarDayDifference(departureDate, today);
  if (days > 1) return { days, label: `${days} days until departure`, status: "upcoming" };
  if (days === 1) return { days, label: "1 day until departure", status: "tomorrow" };
  if (days === 0) return { days, label: "Departure day", status: "departure" };
  return { days, label: "Your trip is underway", status: "underway" };
}

export function formatDepartureDate(value: string): string {
  const parts = parseLocalDate(value);
  if (!parts) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(parts.year, parts.month - 1, parts.day, 12));
}
