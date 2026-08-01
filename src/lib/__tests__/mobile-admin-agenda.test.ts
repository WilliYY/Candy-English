import assert from "node:assert/strict";
import test from "node:test";

import {
  getMobileAdminAgenda,
  MobileAdminAgendaError,
} from "@/lib/mobile-admin-agenda";

const admin = {
  email: "admin@candyenglish.com",
  id: "admin-1",
  name: "Admin Candy",
  role: "ADMIN" as const,
};

function lesson(overrides: Record<string, unknown> = {}) {
  return {
    date: new Date("2026-08-10T12:00:00.000Z"),
    id: "lesson-1",
    isMakeup: false,
    notes: "Levar material",
    status: "SCHEDULED" as const,
    student: {
      id: "agenda-student-1",
      name: "Ana Candy",
      notes: "Responsavel avisado",
      phone: "44999999999",
      unit: "IVATE" as const,
    },
    time: "14:00",
    updatedAt: new Date("2026-08-01T12:00:00.000Z"),
    ...overrides,
  };
}

test("rejects non-admin agenda access before querying lessons", async () => {
  let touched = false;
  await assert.rejects(
    () =>
      getMobileAdminAgenda(
        { ...admin, role: "TEACHER" },
        { month: 8, year: 2026 },
        {
          store: {
            agendaLesson: { findMany: async () => (touched = true, []) },
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminAgendaError &&
      error.code === "ROLE_FORBIDDEN",
  );
  assert.equal(touched, false);
});

test("returns a safe monthly calendar and selected daily queue", async () => {
  const agenda = await getMobileAdminAgenda(
    admin,
    { date: "2026-08-10", month: 8, unit: "ALL", year: 2026 },
    {
      now: () => new Date("2026-08-15T15:00:00.000Z"),
      store: {
        agendaLesson: {
          findMany: async () => [
            lesson(),
            lesson({
              date: new Date("2026-08-10T15:00:00.000Z"),
              id: "lesson-2",
              isMakeup: true,
              notes: null,
              status: "MAKEUP_ATTENDED" as const,
              student: {
                id: "agenda-student-2",
                name: "Bruna Candy",
                notes: null,
                phone: null,
                unit: "DOURADINA" as const,
              },
              time: "15:00",
            }),
            lesson({
              date: new Date("2026-08-11T12:00:00.000Z"),
              id: "lesson-3",
              status: "MISSED" as const,
            }),
          ],
        },
      } as never,
    },
  );

  assert.equal(agenda.days.length, 31);
  assert.deepEqual(
    agenda.days.find((day) => day.date === "2026-08-10"),
    {
      attendedCount: 1,
      count: 2,
      date: "2026-08-10",
      makeupCount: 1,
      missedCount: 0,
      scheduledCount: 1,
    },
  );
  assert.deepEqual(agenda.summary, {
    attendedCount: 1,
    count: 3,
    makeupCount: 1,
    missedCount: 1,
    scheduledCount: 1,
  });
  assert.equal(agenda.dailyLessons.length, 2);
  assert.equal(agenda.dailyLessons[0]?.studentName, "Ana Candy");
  assert.equal(agenda.dailyLessons[0]?.studentPhone, "44999999999");
  assert.equal("createdAt" in agenda.dailyLessons[0]!, false);
});

test("filters the month by unit and the daily queue by normalized search", async () => {
  let where: unknown;
  const agenda = await getMobileAdminAgenda(
    admin,
    {
      date: "2026-08-10",
      month: "8",
      query: "brúna",
      unit: "DOURADINA",
      year: "2026",
    },
    {
      store: {
        agendaLesson: {
          findMany: async (input: { where: unknown }) => {
            where = input.where;
            return [
              lesson({
                id: "lesson-2",
                student: {
                  id: "agenda-student-2",
                  name: "Bruna Candy",
                  notes: null,
                  phone: "44988888888",
                  unit: "DOURADINA" as const,
                },
              }),
              lesson({ id: "lesson-3", student: { ...lesson().student, name: "Ana" } }),
            ];
          },
        },
      } as never,
    },
  );

  assert.match(JSON.stringify(where), /DOURADINA/);
  assert.deepEqual(agenda.dailyLessons.map((item) => item.studentName), [
    "Bruna Candy",
  ]);
  assert.equal(agenda.summary.count, 2);
});

test("rejects a selected date outside the requested month before querying", async () => {
  let touched = false;
  await assert.rejects(
    () =>
      getMobileAdminAgenda(
        admin,
        { date: "2026-09-01", month: 8, year: 2026 },
        {
          store: {
            agendaLesson: { findMany: async () => (touched = true, []) },
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminAgendaError && error.code === "INVALID_QUERY",
  );
  assert.equal(touched, false);
});

test("refuses to truncate an agenda month above the safe mobile limit", async () => {
  await assert.rejects(
    () =>
      getMobileAdminAgenda(
        admin,
        { month: 8, year: 2026 },
        {
          store: {
            agendaLesson: {
              findMany: async () =>
                Array.from({ length: 2_001 }, (_, index) =>
                  lesson({ id: `lesson-${index}` }),
                ),
            },
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminAgendaError && error.code === "RESULT_LIMIT",
  );
});
