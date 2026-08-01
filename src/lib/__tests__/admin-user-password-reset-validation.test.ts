import assert from "node:assert/strict";
import test from "node:test";
import { adminResetUserPasswordSchema } from "../validations/admin-users";

test("accepts a matching password confirmation", () => {
  const result = adminResetUserPasswordSchema.safeParse({
    confirmPassword: "CandyNova123",
    newPassword: "CandyNova123",
    userId: "user-1",
  });

  assert.equal(result.success, true);
});

test("rejects a different password confirmation", () => {
  const result = adminResetUserPasswordSchema.safeParse({
    confirmPassword: "OutraSenha123",
    newPassword: "CandyNova123",
    userId: "user-1",
  });

  assert.equal(result.success, false);
  assert.equal(
    result.error?.issues.some(
      (issue) =>
        issue.path[0] === "confirmPassword" &&
        issue.message === "As senhas precisam ser iguais.",
    ),
    true,
  );
});
