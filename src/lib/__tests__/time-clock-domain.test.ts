import assert from "node:assert/strict";
import test from "node:test";
import {
  formatSaoPauloDateTimeInput,
  getNextTimeClockEntryType,
  getSaoPauloMonthRange,
  parseSaoPauloDateTimeInput,
  summarizeTimeClockEntries,
} from "../time-clock-domain";

test("alternates the next punch without limiting daily pairs", () => {
  assert.equal(getNextTimeClockEntryType(null), "ENTRY");
  assert.equal(getNextTimeClockEntryType("ENTRY"), "EXIT");
  assert.equal(getNextTimeClockEntryType("EXIT"), "ENTRY");
});

test("uses Sao Paulo month boundaries in UTC", () => {
  const range = getSaoPauloMonthRange(2026, 8);

  assert.equal(range.start.toISOString(), "2026-08-01T03:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-09-01T03:00:00.000Z");
});

test("round-trips an administrative Sao Paulo date-time input", () => {
  const parsed = parseSaoPauloDateTimeInput("2026-08-23T09:45");

  assert.equal(parsed?.toISOString(), "2026-08-23T12:45:00.000Z");
  assert.equal(
    formatSaoPauloDateTimeInput(new Date("2026-08-23T12:45:00.000Z")),
    "2026-08-23T09:45",
  );
  assert.equal(parseSaoPauloDateTimeInput("2026-02-30T09:45"), null);
});


test("totals every completed entry and exit pair", () => {
  const summary = summarizeTimeClockEntries([
    { occurredAt: new Date("2026-08-03T11:00:00.000Z"), type: "ENTRY" },
    { occurredAt: new Date("2026-08-03T15:00:00.000Z"), type: "EXIT" },
    { occurredAt: new Date("2026-08-03T16:00:00.000Z"), type: "ENTRY" },
    { occurredAt: new Date("2026-08-03T21:30:00.000Z"), type: "EXIT" },
  ]);

  assert.deepEqual(summary, {
    completedPairs: 2,
    inconsistentEntries: 0,
    openEntryAt: null,
    workedMilliseconds: 9.5 * 60 * 60 * 1000,
  });
});

test("keeps an unmatched entry open and reports inconsistent sequences", () => {
  const openAt = new Date("2026-08-03T16:00:00.000Z");
  const summary = summarizeTimeClockEntries([
    { occurredAt: new Date("2026-08-03T10:00:00.000Z"), type: "EXIT" },
    { occurredAt: new Date("2026-08-03T11:00:00.000Z"), type: "ENTRY" },
    { occurredAt: openAt, type: "ENTRY" },
  ]);

  assert.equal(summary.completedPairs, 0);
  assert.equal(summary.inconsistentEntries, 2);
  assert.equal(summary.openEntryAt?.toISOString(), openAt.toISOString());
  assert.equal(summary.workedMilliseconds, 0);
});
