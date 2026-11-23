import assert from "node:assert/strict";
import test from "node:test";
import { currentSchoolYear, selectedSchoolYear } from "../school-year";
import { adminFinanceExpenseCreateSchema, adminAgendaMakeupSchema } from "../validations/admin-users";

test("uses the São Paulo year and allows opening the next fiscal year explicitly", () => {
  assert.equal(currentSchoolYear(new Date("2027-01-01T01:00:00Z")), 2026);
  assert.equal(currentSchoolYear(new Date("2027-01-01T03:00:00Z")), 2027);
  assert.equal(selectedSchoolYear("2027", 2026), 2027);
  assert.equal(selectedSchoolYear("invalid", 2027), 2027);
});

test("expenses and makeup classes accept 2027 dates and reject inconsistent periods", () => {
  const expense = { actorName: "Equipe", amount: "2.00", itemName: "Material", month: 1,
    purchasedAt: "2027-01-04", unit: "IVATE", year: 2027 };
  assert.equal(adminFinanceExpenseCreateSchema.safeParse(expense).success, true);
  assert.equal(adminFinanceExpenseCreateSchema.safeParse({ ...expense, year: 2026 }).success, false);
  const makeup = { date: "2027-01-04", lessonId: "fixture", time: "14:00" };
  assert.equal(adminAgendaMakeupSchema.safeParse(makeup).success, true);
  assert.equal(adminAgendaMakeupSchema.safeParse({ ...makeup, date: "2027-02-30" }).success, false);
});
