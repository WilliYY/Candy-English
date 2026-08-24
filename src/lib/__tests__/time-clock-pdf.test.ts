import assert from "node:assert/strict";
import test from "node:test";
import { buildTimeClockPdf } from "../time-clock-pdf";

test("generates a non-empty monthly point report PDF", async () => {
  const pdf = await buildTimeClockPdf({
    entries: [
      {
        correctedAt: null,
        justification: "Inicio do expediente",
        occurredAt: new Date("2026-08-03T11:00:00.000Z"),
        source: "SELF",
        type: "ENTRY",
      },
      {
        correctedAt: new Date("2026-08-03T15:10:00.000Z"),
        justification: "Almoco",
        occurredAt: new Date("2026-08-03T15:00:00.000Z"),
        source: "ADMIN",
        type: "EXIT",
      },
    ],
    generatedAt: new Date("2026-08-23T12:00:00.000Z"),
    period: { month: 8, year: 2026 },
    person: { email: "teacher@example.com", name: "Teacher Candy" },
    summary: {
      completedPairs: 1,
      inconsistentEntries: 0,
      openEntryAt: null,
      workedMilliseconds: 4 * 60 * 60 * 1000,
    },
  });

  assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.ok(pdf.byteLength > 1_000);
});
