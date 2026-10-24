import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  addDays, calendarDays, dateKey, daysUntil, diffInDays, formatDate,
  parseDateKey, predictCycle
} from "./cycle";

const date = parseDateKey;

test("strict date-only parsing accepts real leap dates and early years", () => {
  for (const key of ["2024-02-29", "2000-02-29", "0099-01-01", "0000-02-29"]) {
    assert.equal(dateKey(date(key)), key);
  }
});

test("strict parsing rejects normalization, malformed strings and wrong types", () => {
  for (const key of ["2023-02-29", "1900-02-29", "2024-04-31", "2024-13-01",
    "2024-00-01", "2024-01-00", "2024-1-01", " 2024-01-01", "2024-01-01T00:00:00Z", ""]) {
    assert.throws(() => date(key), RangeError);
  }
  assert.throws(() => date(null as unknown as string), RangeError);
});

test("Date helpers reject invalid Date values and runtime wrong types", () => {
  for (const invalid of [new Date(NaN), null, "2024-01-01"] as unknown as Date[]) {
    for (const operation of [() => dateKey(invalid), () => addDays(invalid, 1),
      () => diffInDays(invalid, date("2024-01-01")), () => daysUntil(invalid),
      () => formatDate(invalid), () => predictCycle(invalid)]) {
      assert.throws(operation, RangeError);
    }
  }
});

test("UTC day arithmetic crosses leap years and year boundaries without mutation", () => {
  const original = new Date("2024-02-28T23:45:00Z");
  assert.equal(addDays(original, 1).toISOString(), "2024-02-29T00:00:00.000Z");
  assert.equal(original.toISOString(), "2024-02-28T23:45:00.000Z");
  assert.equal(dateKey(addDays(date("2024-01-01"), -1)), "2023-12-31");
  assert.equal(dateKey(addDays(date("2024-02-29"), 1)), "2024-03-01");
});

test("differences use UTC dates, not elapsed hours or local daylight saving", () => {
  assert.equal(diffInDays(new Date("2024-03-10T23:59:59Z"), new Date("2024-03-11T00:00:00Z")), 1);
  assert.equal(diffInDays(date("2024-11-02"), date("2024-11-04")), 2);
  assert.equal(diffInDays(date("2024-03-11"), date("2024-03-10")), -1);
  assert.equal(diffInDays(new Date("2024-03-10T00:01Z"), new Date("2024-03-10T23:59Z")), 0);
});

test("countdowns never go negative and accept explicit reference days", () => {
  const now = new Date("2026-10-24T23:59Z");
  assert.equal(daysUntil(date("2026-10-23"), now), 0);
  assert.equal(daysUntil(date("2026-10-24"), now), 0);
  assert.equal(daysUntil(date("2026-10-25"), now), 1);
  assert.throws(() => daysUntil(now, new Date(NaN)), RangeError);
});

test("default lengths preserve inclusive duration and existing estimate offsets", () => {
  const result = predictCycle(date("2024-02-01"), undefined, undefined, date("2024-02-01"));
  assert.deepEqual(Object.fromEntries(Object.entries(result).map(([key, value]) => [key, dateKey(value)])), {
    nextPeriodStart: "2024-02-29", nextPeriodEnd: "2024-03-04",
    ovulationDate: "2024-02-15", fertileWindowStart: "2024-02-10", fertileWindowEnd: "2024-02-16"
  });
});

test("old anchors advance whole cycles and keep a prediction on today", () => {
  const anchor = date("2026-06-02");
  const result = predictCycle(anchor, 29, 5, date("2026-10-24"));
  assert.equal(dateKey(result.nextPeriodStart), "2026-10-25");
  assert.equal(dateKey(result.nextPeriodEnd), "2026-10-29");
  assert.equal(dateKey(predictCycle(anchor, 29, 5, new Date("2026-10-25T23:59Z")).nextPeriodStart), "2026-10-25");
  assert.equal(dateKey(predictCycle(anchor, 29, 5, date("2026-10-26")).nextPeriodStart), "2026-11-23");
  assert.equal(dateKey(anchor), "2026-06-02");
  assert.ok(diffInDays(new Date(), predictCycle(anchor).nextPeriodStart) >= 0);
});

test("length validation is arithmetic, not a medical range", () => {
  for (const length of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "28", null]) {
    assert.throws(() => predictCycle(date("2024-01-01"), length as number), RangeError);
    assert.throws(() => predictCycle(date("2024-01-01"), 28, length as number), RangeError);
  }
  assert.throws(() => predictCycle(date("2024-01-01"), 28, 29), RangeError);
  assert.throws(() => predictCycle(date("2024-01-01"), 28, 5, new Date(NaN)), RangeError);
  const result = predictCycle(date("2024-01-01"), 1, 1, date("2024-01-01"));
  assert.equal(dateKey(result.nextPeriodStart), dateKey(result.nextPeriodEnd));
});

test("arithmetic overflow and fractional offsets fail explicitly", () => {
  for (const offset of [0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => addDays(date("2024-01-01"), offset), RangeError);
  }
  assert.throws(() => addDays(new Date(8640000000000000), 1), RangeError);
  assert.throws(() => predictCycle(date("2024-01-01"), Number.MAX_SAFE_INTEGER), RangeError);
});

test("calendar entries have stable UTC keys, days and Sunday-based weekdays", () => {
  const february = calendarDays(2024, 1);
  assert.equal(february.length, 29);
  assert.deepEqual(february[0], { date: date("2024-02-01"), key: "2024-02-01", day: 1, weekday: 4 });
  assert.equal(february[28].key, "2024-02-29");
  assert.equal(calendarDays(2023, 1).length, 28);
  assert.equal(calendarDays(1900, 1).length, 28);
  assert.equal(calendarDays(2000, 1).length, 29);
  assert.equal(calendarDays(99, 0)[0].key, "0099-01-01");
  assert.equal(calendarDays(9999, 11)[30].key, "9999-12-31");
  assert.equal(new Set(february.map(day => day.key)).size, 29);
});

test("calendar arguments reject implicit rollover", () => {
  for (const [year, month] of [[2024, -1], [2024, 12], [2024, 0.5], [NaN, 1], [-1, 0], [10000, 0], [2024.5, 0]]) {
    assert.throws(() => calendarDays(year, month), RangeError);
  }
});

test("formatting stays on the UTC date", () => {
  const input = new Date("2024-02-29T23:59:00Z");
  assert.equal(formatDate(input), new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", timeZone: "UTC"
  }).format(input));
});
