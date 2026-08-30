import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAnonymizedUserEmail,
  getUserAnonymizationDate,
  isUserReadyForAnonymization,
} from "@/lib/user-retention";

test("schedules account anonymization for exactly two calendar years", () => {
  assert.equal(
    getUserAnonymizationDate(new Date("2026-08-30T15:45:00.000Z")).toISOString(),
    "2028-08-30T15:45:00.000Z",
  );

  assert.equal(
    getUserAnonymizationDate(new Date("2028-02-29T12:00:00.000Z")).toISOString(),
    "2030-02-28T12:00:00.000Z",
  );
});

test("only expired, deleted and not-yet-anonymized accounts are eligible", () => {
  const now = new Date("2028-08-30T15:45:00.000Z");

  assert.equal(
    isUserReadyForAnonymization(
      {
        anonymizedAt: null,
        deletedAt: new Date("2026-08-30T15:45:00.000Z"),
        scheduledAnonymizationAt: new Date("2028-08-30T15:45:00.000Z"),
      },
      now,
    ),
    true,
  );

  assert.equal(
    isUserReadyForAnonymization(
      {
        anonymizedAt: null,
        deletedAt: null,
        scheduledAnonymizationAt: new Date("2028-08-30T15:45:00.000Z"),
      },
      now,
    ),
    false,
  );

  assert.equal(
    isUserReadyForAnonymization(
      {
        anonymizedAt: new Date("2028-08-30T15:45:00.000Z"),
        deletedAt: new Date("2026-08-30T15:45:00.000Z"),
        scheduledAnonymizationAt: new Date("2028-08-30T15:45:00.000Z"),
      },
      now,
    ),
    false,
  );
});

test("creates a deterministic unique technical email after anonymization", () => {
  assert.equal(
    buildAnonymizedUserEmail("cma_123-ABC"),
    "conta-excluida+cma_123-abc@retencao.invalid",
  );
});
