import assert from "node:assert/strict";
import test from "node:test";

import {
  getAccessSessionProblem,
  getRefreshSessionProblem,
  type MobileSessionPolicyInput,
} from "../session-policy";

const now = new Date("2026-07-30T12:00:00.000Z");

function validInput(): MobileSessionPolicyInput {
  return {
    accessExpiresAt: new Date("2026-07-30T12:15:00.000Z"),
    deviceInstallationId: "installation-12345678",
    expectedInstallationId: "installation-12345678",
    refreshConsumedAt: null,
    refreshExpiresAt: new Date("2026-08-29T12:00:00.000Z"),
    revokedAt: null,
    sessionVersion: 4,
    userIsActive: true,
    userSessionVersion: 4,
  };
}

test("accepts a current active session", () => {
  assert.equal(getAccessSessionProblem(validInput(), now), null);
  assert.equal(getRefreshSessionProblem(validInput(), now), null);
});

test("invalidates access when the user or session changes", () => {
  assert.equal(
    getAccessSessionProblem(
      { ...validInput(), userSessionVersion: 5 },
      now,
    ),
    "SESSION_CHANGED",
  );
  assert.equal(
    getAccessSessionProblem({ ...validInput(), userIsActive: false }, now),
    "USER_INACTIVE",
  );
  assert.equal(
    getAccessSessionProblem(
      {
        ...validInput(),
        accessExpiresAt: new Date("2026-07-30T11:59:59.999Z"),
      },
      now,
    ),
    "ACCESS_EXPIRED",
  );
});

test("detects refresh replay before rotating another token", () => {
  assert.equal(
    getRefreshSessionProblem(
      {
        ...validInput(),
        refreshConsumedAt: new Date("2026-07-30T11:59:00.000Z"),
      },
      now,
    ),
    "REFRESH_REPLAYED",
  );
});

test("binds refresh to the app installation", () => {
  assert.equal(
    getRefreshSessionProblem(
      { ...validInput(), expectedInstallationId: "another-installation" },
      now,
    ),
    "DEVICE_MISMATCH",
  );
});
