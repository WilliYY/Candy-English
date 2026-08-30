import assert from "node:assert/strict";
import test from "node:test";

import { adminDeleteUserSchema } from "@/lib/validations/admin-users";

test("requires an explicit deletion confirmation and a reason", () => {
  assert.equal(
    adminDeleteUserSchema.safeParse({
      confirmation: "EXCLUIR",
      reason: "Cliente encerrou o vinculo",
      userId: "user-1",
    }).success,
    true,
  );

  const invalid = adminDeleteUserSchema.safeParse({
    confirmation: "sim",
    reason: "",
    userId: "user-1",
  });

  assert.equal(invalid.success, false);

  if (!invalid.success) {
    assert.deepEqual(
      new Set(invalid.error.issues.map((issue) => issue.path[0])),
      new Set(["confirmation", "reason"]),
    );
  }
});
