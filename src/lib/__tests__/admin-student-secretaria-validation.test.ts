import assert from "node:assert/strict";
import test from "node:test";
import {
  adminCreateUserSchema,
  adminUpdateStudentContactSchema,
} from "../validations/admin-users";

test("defaults a directly created student to the Ivate unit", () => {
  const result = adminCreateUserSchema.safeParse({
    confirmPassword: "CandyAluno123",
    email: "aluno@candy.local",
    name: "Aluno Candy",
    password: "CandyAluno123",
    role: "STUDENT",
  });

  assert.equal(result.success, true);
  assert.equal(result.data?.unit, "IVATE");
});

test("accepts Douradina when editing a registered student", () => {
  const result = adminUpdateStudentContactSchema.safeParse({
    email: "aluno@candy.local",
    name: "Aluno Candy",
    phone: "44999999999",
    unit: "DOURADINA",
    userId: "user-1",
  });

  assert.equal(result.success, true);
  assert.equal(result.data?.unit, "DOURADINA");
});

test("rejects an unknown unit when editing a student", () => {
  const result = adminUpdateStudentContactSchema.safeParse({
    email: "aluno@candy.local",
    name: "Aluno Candy",
    phone: "44999999999",
    unit: "OUTRO_POLO",
    userId: "user-1",
  });

  assert.equal(result.success, false);
});
