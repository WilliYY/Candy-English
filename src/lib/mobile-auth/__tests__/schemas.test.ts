import assert from "node:assert/strict";
import test from "node:test";

import { mobileLoginSchema, mobileRefreshSchema } from "../schemas";
import { createMobileToken } from "../tokens";

test("normalizes a valid mobile login without accepting unknown fields", () => {
  const parsed = mobileLoginSchema.safeParse({
    device: {
      appVersion: "0.1.0",
      installationId: "installation-12345678",
      name: "Android da escola",
      platform: "ANDROID",
    },
    email: "  Teacher@Candy.Example  ",
    mfaCode: "123456",
    password: "correct-password",
  });

  assert.equal(parsed.success, true);

  if (parsed.success) {
    assert.equal(parsed.data.email, "teacher@candy.example");
    assert.equal(parsed.data.mfaCode, "123456");
  }

  assert.equal(
    mobileLoginSchema.safeParse({
      device: {
        installationId: "installation-12345678",
        platform: "ANDROID",
      },
      email: "teacher@candy.example",
      password: "correct-password",
      role: "ADMIN",
    }).success,
    false,
  );
});

test("accepts only a refresh token bound to a valid installation id", () => {
  assert.equal(
    mobileRefreshSchema.safeParse({
      installationId: "installation-12345678",
      refreshToken: createMobileToken("refresh").value,
    }).success,
    true,
  );
  assert.equal(
    mobileRefreshSchema.safeParse({
      installationId: "short",
      refreshToken: createMobileToken("access").value,
    }).success,
    false,
  );
});
