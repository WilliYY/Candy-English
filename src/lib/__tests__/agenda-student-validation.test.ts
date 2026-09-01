import assert from "node:assert/strict";
import test from "node:test";
import { adminAgendaScheduleCreateSchema } from "../validations/admin-users";

const validSchedule = {
  month: 8,
  name: "Ana Candy",
  notes: "",
  phone: "44999999999",
  time: "14:00",
  unit: "IVATE",
  weekdays: [1, 3],
  year: 2026,
};

test("rejects an agenda entry without a linked AVA student", () => {
  const result = adminAgendaScheduleCreateSchema.safeParse(validSchedule);

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(
      result.error.issues.some((issue) => issue.path[0] === "studentProfileId"),
      true,
    );
  }
});

test("accepts an agenda entry linked to a student profile", () => {
  const result = adminAgendaScheduleCreateSchema.safeParse({
    ...validSchedule,
    studentProfileId: "student-profile-1",
  });

  assert.equal(result.success, true);
});
