import assert from "node:assert/strict";
import test from "node:test";
import {
  timeClockEntryCorrectionSchema,
  timeClockManualEntrySchema,
  timeClockPunchSchema,
  timeClockReportQuerySchema,
} from "../validations/time-clock";

test("accepts a self punch with an optional justification", () => {
  const result = timeClockPunchSchema.safeParse({
    justification: "Retorno do almoco",
    operationId: "punch-operation-123",
    type: "ENTRY",
  });

  assert.equal(result.success, true);
});
test("rejects a short operation identifier", () => {
  const result = timeClockPunchSchema.safeParse({
    justification: "",
    operationId: "short",
    type: "EXIT",
  });

  assert.equal(result.success, false);
});

test("accepts an administrative manual punch at an explicit time", () => {
  const result = timeClockManualEntrySchema.safeParse({
    justification: "Registro informado ao administrativo",
    occurredAt: "2026-08-23T12:30:00.000Z",
    profileId: "profile-1",
    type: "ENTRY",
  });

  assert.equal(result.success, true);
});

test("requires a correction reason when admin changes a punch", () => {
  const result = timeClockEntryCorrectionSchema.safeParse({
    correctionReason: "",
    entryId: "entry-1",
    expectedUpdatedAt: "2026-08-23T12:35:00.000Z",
    justification: "",
    occurredAt: "2026-08-23T12:30:00.000Z",
    type: "ENTRY",
  });

  assert.equal(result.success, false);
});

test("limits report queries to a valid calendar month", () => {
  assert.equal(
    timeClockReportQuerySchema.safeParse({
      month: "8",
      profileId: "profile-1",
      year: "2026",
    }).success,
    true,
  );
  assert.equal(
    timeClockReportQuerySchema.safeParse({
      month: "13",
      profileId: "profile-1",
      year: "2026",
    }).success,
    false,
  );
});
