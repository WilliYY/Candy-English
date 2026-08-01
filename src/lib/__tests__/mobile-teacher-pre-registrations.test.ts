import assert from "node:assert/strict";
import test from "node:test";

import {
  getMobileTeacherPreRegistration,
  type MobileTeacherPreRegistrationStore,
} from "../mobile-teacher-pre-registrations";

function asStore(value: unknown) {
  return value as MobileTeacherPreRegistrationStore;
}

test("rejects an invalid request id before querying the teacher profile", async () => {
  let profileQueries = 0;
  const result = await getMobileTeacherPreRegistration("teacher-user", "", {
    store: asStore({
      studentPreRegistration: { findFirst: async () => null },
      teacherProfile: {
        findUnique: async () => {
          profileQueries += 1;
          return null;
        },
      },
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "INVALID");
  assert.equal(profileQueries, 0);
});

test("loads only an own or assigned pre-registration with safe readiness flags", async () => {
  let query: unknown;
  const result = await getMobileTeacherPreRegistration(
    "teacher-user",
    "request-1",
    {
      store: asStore({
        studentPreRegistration: {
          findFirst: async (args: unknown) => {
            query = args;
            return {
              convertedAgendaStudentId: null,
              convertedFinancialStudentId: null,
              convertedStudentProfileId: null,
              convertedUserId: null,
              email: "student@example.com",
              englishGoal: "Conversation",
              estimatedLevel: "A2",
              fullName: "Student One",
              id: "request-1",
              intendedTime: null,
              intendedWeekdayMask: 0,
              paymentDay: null,
              paymentMethod: null,
              phone: "44999990000",
              status: "READY_TO_CONVERT",
              statusNote: null,
              studentPhone: null,
              tuitionCents: null,
              unit: "IVATE",
              updatedAt: new Date("2026-08-01T20:00:00.000Z"),
            };
          },
        },
        teacherProfile: { findUnique: async () => ({ id: "teacher-1" }) },
      }),
    },
  );

  assert.equal(result.ok, true);
  assert.deepEqual((query as { where: unknown }).where, {
    OR: [
      { assignedTeacherProfileId: "teacher-1" },
      { createdByUserId: "teacher-user" },
    ],
    id: "request-1",
  });
  assert.deepEqual(result.data, {
    agenda: { complete: false, days: null, time: null },
    canConvert: true,
    converted: false,
    email: "student@example.com",
    englishGoal: "Conversation",
    estimatedLevel: "A2",
    finance: { complete: false },
    fullName: "Student One",
    id: "request-1",
    phone: "44999990000",
    status: "READY_TO_CONVERT",
    statusNote: null,
    unit: "IVATE",
    updatedAt: "2026-08-01T20:00:00.000Z",
  });
  assert.equal("tuitionCents" in (result.data ?? {}), false);
  assert.equal("guardianDocument" in (result.data ?? {}), false);
});

test("returns not found without leaking an unrelated pre-registration", async () => {
  const result = await getMobileTeacherPreRegistration(
    "teacher-user",
    "request-other",
    {
      store: asStore({
        studentPreRegistration: { findFirst: async () => null },
        teacherProfile: { findUnique: async () => ({ id: "teacher-1" }) },
      }),
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "NOT_FOUND");
});
