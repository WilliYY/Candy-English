import assert from "node:assert/strict";
import test from "node:test";
import { suggestStudentAccess } from "../finance-student-access";

test("suggests a readable Candy login without accents", () => {
  assert.deepEqual(suggestStudentAccess("João Pedro"), {
    email: "joao.pedro@candy.local",
    password: "joaocandy",
  });

  assert.deepEqual(suggestStudentAccess("Maria da Conceicao"), {
    email: "maria.da.conceicao@candy.local",
    password: "mariacandy",
  });
});

test("keeps the suggested password at eight characters or more", () => {
  const access = suggestStudentAccess("Lu");

  assert.equal(access.email, "lu@candy.local");
  assert.ok(access.password.length >= 8);
});
