const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type CyclePrediction = {
  nextPeriodStart: Date;
  nextPeriodEnd: Date;
  fertileWindowStart: Date;
  fertileWindowEnd: Date;
  ovulationDate: Date;
};

function utcDay(date: Date): Date {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    throw new RangeError("Expected a valid Date");
  }
  const next = new Date(date.getTime());
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

/** Strict YYYY-MM-DD input; Date constructors alone silently normalize bad days. */
export function parseDateKey(value: string): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError("Expected YYYY-MM-DD");
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || dateKey(parsed) !== value) {
    throw new RangeError("Invalid calendar date");
  }
  return parsed;
}

export function dateKey(date: Date): string {
  return utcDay(date).toISOString().split("T")[0];
}

export function addDays(date: Date, days: number): Date {
  if (!Number.isSafeInteger(days)) {
    throw new RangeError("Days must be a safe integer");
  }
  const next = utcDay(date);
  next.setUTCDate(next.getUTCDate() + days);
  return utcDay(next);
}

export function diffInDays(start: Date, end: Date) {
  return (utcDay(end).getTime() - utcDay(start).getTime()) / MS_PER_DAY;
}

/** Past dates have a zero countdown; diffInDays remains signed. */
export function daysUntil(date: Date, now: Date = new Date()): number {
  return Math.max(0, diffInDays(now, date));
}

/** Arithmetic estimates only. Old anchors advance by whole cycles, not new logs. */
export function predictCycle(
  lastPeriodStart: Date,
  cycleLength = 28,
  periodLength = 5,
  now: Date = new Date()
): CyclePrediction {
  if (!Number.isSafeInteger(cycleLength) || cycleLength <= 0 ||
      !Number.isSafeInteger(periodLength) || periodLength <= 0 ||
      periodLength > cycleLength) {
    throw new RangeError("Lengths must be positive safe integers; period cannot exceed cycle");
  }
  const elapsed = diffInDays(lastPeriodStart, now);
  const cycles = Math.max(1, Math.ceil(elapsed / cycleLength));
  const nextPeriodStart = addDays(lastPeriodStart, cycles * cycleLength);
  const nextPeriodEnd = addDays(nextPeriodStart, periodLength - 1);
  const ovulationDate = addDays(nextPeriodStart, -14);

  return {
    nextPeriodStart,
    nextPeriodEnd,
    fertileWindowStart: addDays(ovulationDate, -5),
    fertileWindowEnd: addDays(ovulationDate, 1),
    ovulationDate
  };
}

export type CalendarDay = {
  date: Date;
  key: string;
  day: number;
  weekday: number;
};

/** Month is zero-based (0 = January); weekdays are Sunday = 0. No padding cells. */
export function calendarDays(year: number, month: number): CalendarDay[] {
  if (!Number.isInteger(year) || year < 0 || year > 9999 ||
      !Number.isInteger(month) || month < 0 || month > 11) {
    throw new RangeError("Expected year 0..9999 and month 0..11");
  }
  const first = new Date(0);
  first.setUTCFullYear(year, month, 1);
  const last = new Date(first);
  last.setUTCMonth(month + 1, 0);
  return Array.from({ length: last.getUTCDate() }, (_, index) => {
    const date = addDays(first, index);
    return { date, key: dateKey(date), day: index + 1, weekday: date.getUTCDay() };
  });
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC"
  }).format(utcDay(date));
}
