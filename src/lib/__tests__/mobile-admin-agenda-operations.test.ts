import assert from "node:assert/strict";
import test from "node:test";

import {
  createMobileAdminAgendaMakeup,
  getMobileAdminAgendaLesson,
  MobileAdminAgendaOperationsError,
  updateMobileAdminAgendaAttendance,
} from "@/lib/mobile-admin-agenda-operations";

const admin = {
  email: "admin@candy.example",
  id: "admin-1",
  name: "Admin Candy",
  role: "ADMIN" as const,
};
const expectedUpdatedAt = "2026-08-11T12:00:00.000Z";
const attendanceOperationId = "11111111-1111-4111-8111-111111111111";
const attendanceOperationKey =
  `admin-agenda:attendance:${attendanceOperationId}`;
const makeupOperationId = "22222222-2222-4222-8222-222222222222";
const makeupOperationKey = `admin-agenda:makeup:${makeupOperationId}`;

function lesson(overrides: Record<string, unknown> = {}) {
  return {
    createdByMobileOperationId: null,
    date: new Date("2026-08-10T12:00:00.000Z"),
    id: "lesson-1",
    isActive: true,
    isMakeup: false,
    lastMobileOperationId: null,
    makeupForLessonId: null,
    notes: "Levar material",
    status: "SCHEDULED" as const,
    student: {
      id: "agenda-student-1",
      name: "Ana Candy",
      notes: "Responsavel avisado",
      phone: "44999999999",
      unit: "IVATE" as const,
    },
    studentId: "agenda-student-1",
    time: "14:00",
    updatedAt: new Date(expectedUpdatedAt),
    weekday: 1,
    ...overrides,
  };
}

test("rejects non-admin lesson detail before reading agenda data", async () => {
  let touched = false;
  await assert.rejects(
    () =>
      getMobileAdminAgendaLesson(
        { ...admin, role: "TEACHER" },
        "lesson-1",
        {
          store: {
            agendaLesson: { findUnique: async () => (touched = true, null) },
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminAgendaOperationsError &&
      error.code === "ROLE_FORBIDDEN",
  );
  assert.equal(touched, false);
});

test("returns safe lesson detail and student history", async () => {
  const detail = await getMobileAdminAgendaLesson(admin, "lesson-1", {
    store: {
      agendaLesson: { findUnique: async () => lesson() },
      agendaLog: {
        findMany: async () => [
          {
            action: "ATTENDANCE",
            createdAt: new Date("2026-08-11T12:05:00.000Z"),
            createdByUser: { name: "Williany" },
            description: "Presenca confirmada: Ana Candy.",
            id: "log-1",
            lessonId: "lesson-1",
          },
        ],
      },
    } as never,
  });

  assert.equal(detail.lesson.studentName, "Ana Candy");
  assert.equal(detail.history[0]?.actorName, "Williany");
  assert.equal(detail.history[0]?.description, "Presenca confirmada: Ana Candy.");
  assert.equal("lastMobileOperationId" in detail.lesson, false);
  assert.equal("createdByUserId" in detail.history[0]!, false);
});

test("replays attendance before checking a stale lesson version", async () => {
  let updated = false;
  let logged = false;
  const replayed = lesson({
    lastMobileOperationId: attendanceOperationKey,
    status: "ATTENDED" as const,
    updatedAt: new Date("2026-08-12T12:00:00.000Z"),
  });
  const result = await updateMobileAdminAgendaAttendance(
    admin,
    "lesson-1",
    {
      confirmChange: true,
      expectedUpdatedAt,
      operationId: attendanceOperationId,
      status: "ATTENDED",
    },
    {
      acquireLock: async () => undefined,
      store: {
        $transaction: async (callback: (tx: unknown) => unknown) =>
          callback({
            agendaLesson: {
              findUnique: async (query: { where: Record<string, unknown> }) =>
                "lastMobileOperationId" in query.where ? replayed : null,
              updateMany: async () => (updated = true, { count: 1 }),
            },
            agendaLog: { create: async () => (logged = true) },
          }),
      } as never,
    },
  );

  assert.equal(result.replayed, true);
  assert.equal(result.lesson.status, "ATTENDED");
  assert.equal(updated, false);
  assert.equal(logged, false);
});

test("rejects stale attendance updates without writing", async () => {
  let updated = false;
  await assert.rejects(
    () =>
      updateMobileAdminAgendaAttendance(
        admin,
        "lesson-1",
        {
          confirmChange: true,
          expectedUpdatedAt: "2026-08-01T12:00:00.000Z",
          operationId: attendanceOperationId,
          status: "MISSED",
        },
        {
          acquireLock: async () => undefined,
          store: {
            $transaction: async (callback: (tx: unknown) => unknown) =>
              callback({
                agendaLesson: {
                  findUnique: async (query: { where: Record<string, unknown> }) =>
                    "lastMobileOperationId" in query.where ? null : lesson(),
                  updateMany: async () => (updated = true, { count: 1 }),
                },
                agendaLog: { create: async () => ({}) },
              }),
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminAgendaOperationsError &&
      error.code === "EDIT_CONFLICT",
  );
  assert.equal(updated, false);
});

test("turns attendance on a makeup lesson into MAKEUP_ATTENDED", async () => {
  const current = lesson({ isMakeup: true, status: "MAKEUP_SCHEDULED" as const });
  let writtenStatus: string | undefined;
  let logged = false;
  const result = await updateMobileAdminAgendaAttendance(
    admin,
    "lesson-1",
    {
      confirmChange: true,
      expectedUpdatedAt,
      operationId: attendanceOperationId,
      status: "ATTENDED",
    },
    {
      acquireLock: async () => undefined,
      store: {
        $transaction: async (callback: (tx: unknown) => unknown) =>
          callback({
            agendaLesson: {
              findUnique: async (query: { where: Record<string, unknown> }) => {
                if ("lastMobileOperationId" in query.where) return null;
                return lesson({
                  ...current,
                  ...(writtenStatus
                    ? {
                        lastMobileOperationId: attendanceOperationKey,
                        status: writtenStatus,
                        updatedAt: new Date("2026-08-11T12:01:00.000Z"),
                      }
                    : {}),
                });
              },
              updateMany: async (query: { data: { status: string } }) => {
                writtenStatus = query.data.status;
                return { count: 1 };
              },
            },
            agendaLog: { create: async () => (logged = true) },
          }),
      } as never,
    },
  );

  assert.equal(result.lesson.status, "MAKEUP_ATTENDED");
  assert.equal(writtenStatus, "MAKEUP_ATTENDED");
  assert.equal(logged, true);
});

test("creates one idempotent makeup and marks the original lesson missed", async () => {
  let originalStatus: string | undefined;
  let createdData: Record<string, unknown> | undefined;
  let logged = false;
  const makeup = lesson({
    createdByMobileOperationId: makeupOperationKey,
    date: new Date("2026-08-20T12:00:00.000Z"),
    id: "makeup-1",
    isMakeup: true,
    makeupForLessonId: "lesson-1",
    notes: "Reposicao combinada",
    status: "MAKEUP_SCHEDULED" as const,
    time: "15:30",
    updatedAt: new Date("2026-08-11T12:01:00.000Z"),
    weekday: 4,
  });
  const result = await createMobileAdminAgendaMakeup(
    admin,
    "lesson-1",
    {
      confirmCreate: true,
      date: "2026-08-20",
      expectedUpdatedAt,
      notes: "Reposicao combinada",
      operationId: makeupOperationId,
      time: "15:30",
    },
    {
      acquireLock: async () => undefined,
      store: {
        $transaction: async (callback: (tx: unknown) => unknown) =>
          callback({
            agendaLesson: {
              create: async (query: { data: Record<string, unknown> }) => {
                createdData = query.data;
                return makeup;
              },
              findFirst: async () => null,
              findUnique: async (query: { where: Record<string, unknown> }) =>
                "createdByMobileOperationId" in query.where ? null : lesson(),
              updateMany: async (query: { data: { status: string } }) => {
                originalStatus = query.data.status;
                return { count: 1 };
              },
            },
            agendaLog: { create: async () => (logged = true) },
          }),
      } as never,
    },
  );

  assert.equal(result.replayed, false);
  assert.equal(result.makeupLesson.id, "makeup-1");
  assert.equal(originalStatus, "MISSED");
  assert.equal(createdData?.createdByMobileOperationId, makeupOperationKey);
  assert.equal(createdData?.status, "MAKEUP_SCHEDULED");
  assert.equal(logged, true);
});

test("replays a completed makeup before checking the original lesson version", async () => {
  let created = false;
  let updated = false;
  let logged = false;
  const replayed = lesson({
    createdByMobileOperationId: makeupOperationKey,
    date: new Date("2026-08-20T12:00:00.000Z"),
    id: "makeup-1",
    isMakeup: true,
    makeupForLessonId: "lesson-1",
    status: "MAKEUP_SCHEDULED" as const,
    time: "15:30",
  });
  const result = await createMobileAdminAgendaMakeup(
    admin,
    "lesson-1",
    {
      confirmCreate: true,
      date: "2026-08-20",
      expectedUpdatedAt: "2026-08-01T12:00:00.000Z",
      notes: null,
      operationId: makeupOperationId,
      time: "15:30",
    },
    {
      acquireLock: async () => undefined,
      store: {
        $transaction: async (callback: (tx: unknown) => unknown) =>
          callback({
            agendaLesson: {
              create: async () => (created = true),
              findFirst: async () => null,
              findUnique: async (query: { where: Record<string, unknown> }) =>
                "createdByMobileOperationId" in query.where ? replayed : null,
              updateMany: async () => (updated = true, { count: 1 }),
            },
            agendaLog: { create: async () => (logged = true) },
          }),
      } as never,
    },
  );

  assert.equal(result.replayed, true);
  assert.equal(result.makeupLesson.id, "makeup-1");
  assert.equal(created, false);
  assert.equal(updated, false);
  assert.equal(logged, false);
});

test("blocks a second active makeup for the same original lesson", async () => {
  let updated = false;
  await assert.rejects(
    () =>
      createMobileAdminAgendaMakeup(
        admin,
        "lesson-1",
        {
          confirmCreate: true,
          date: "2026-08-20",
          expectedUpdatedAt,
          notes: null,
          operationId: makeupOperationId,
          time: "15:30",
        },
        {
          acquireLock: async () => undefined,
          store: {
            $transaction: async (callback: (tx: unknown) => unknown) =>
              callback({
                agendaLesson: {
                  findFirst: async () => ({ id: "existing-makeup" }),
                  findUnique: async (query: { where: Record<string, unknown> }) =>
                    "createdByMobileOperationId" in query.where ? null : lesson(),
                  updateMany: async () => (updated = true, { count: 1 }),
                },
                agendaLog: { create: async () => ({}) },
              }),
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminAgendaOperationsError &&
      error.code === "MAKEUP_EXISTS",
  );
  assert.equal(updated, false);
});

test("rejects invalid attendance input before opening a transaction", async () => {
  let touched = false;
  await assert.rejects(
    () =>
      updateMobileAdminAgendaAttendance(
        admin,
        "lesson-1",
        {
          confirmChange: false,
          expectedUpdatedAt,
          operationId: attendanceOperationId,
          status: "ATTENDED",
        },
        {
          store: {
            $transaction: async () => (touched = true),
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminAgendaOperationsError &&
      error.code === "INVALID_INPUT",
  );
  assert.equal(touched, false);
});
