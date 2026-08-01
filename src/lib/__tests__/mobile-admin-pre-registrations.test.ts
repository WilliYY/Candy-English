import assert from "node:assert/strict";
import test from "node:test";

import {
  getMobileAdminPreRegistration,
  getMobileAdminPreRegistrations,
  MobileAdminPreRegistrationsError,
} from "../mobile-admin-pre-registrations";

const admin = {
  email: "admin@candy.example",
  id: "admin-1",
  name: "Admin Candy",
  role: "ADMIN" as const,
};

test("rejects non-admin pre-registration access before querying the database", async () => {
  let touched = false;

  await assert.rejects(
    () =>
      getMobileAdminPreRegistrations(
        { ...admin, role: "TEACHER" },
        {},
        {
          store: {
            studentPreRegistration: {
              count: async () => (touched = true, 0),
              findMany: async () => (touched = true, []),
            },
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminPreRegistrationsError &&
      error.code === "ROLE_FORBIDDEN",
  );

  assert.equal(touched, false);
});

test("lists and filters all administrative pre-registrations with safe pagination", async () => {
  const captured: unknown[] = [];
  const rows = [
    {
      assignedTeacherProfile: { user: { name: "Teacher Candy" } },
      convertedUserId: null,
      createdAt: new Date("2026-08-01T10:00:00.000Z"),
      email: "ana@example.com",
      fullName: "Ana Candy",
      id: "pre-1",
      phone: "44999999999",
      status: "READY_TO_CONVERT",
      statusNote: "Documentos conferidos",
      unit: "IVATE",
      updatedAt: new Date("2026-08-01T12:00:00.000Z"),
    },
    {
      assignedTeacherProfile: null,
      convertedUserId: null,
      createdAt: new Date("2026-07-31T10:00:00.000Z"),
      email: null,
      fullName: "Bia Candy",
      id: "pre-2",
      phone: "44988888888",
      status: "PENDING",
      statusNote: null,
      unit: "IVATE",
      updatedAt: new Date("2026-07-31T12:00:00.000Z"),
    },
  ];

  const result = await getMobileAdminPreRegistrations(
    admin,
    {
      limit: 1,
      query: "Ana",
      status: "OPEN",
      unit: "IVATE",
    },
    {
      now: () => new Date("2026-08-01T13:00:00.000Z"),
      store: {
        studentPreRegistration: {
          count: async ({ where }: { where: unknown }) =>
            (captured.push(where), 2),
          findMany: async (input: unknown) => (captured.push(input), rows),
        },
      } as never,
    },
  );

  assert.deepEqual(result, {
    generatedAt: "2026-08-01T13:00:00.000Z",
    items: [
      {
        assignedTeacherName: "Teacher Candy",
        converted: false,
        createdAt: "2026-08-01T10:00:00.000Z",
        email: "ana@example.com",
        fullName: "Ana Candy",
        id: "pre-1",
        phone: "44999999999",
        status: "READY_TO_CONVERT",
        statusNote: "Documentos conferidos",
        unit: "IVATE",
        updatedAt: "2026-08-01T12:00:00.000Z",
      },
    ],
    nextCursor: "pre-1",
    total: 2,
  });
  assert.equal(JSON.stringify(result).includes("convertedUserId"), false);
  assert.equal(captured.length, 2);
});

test("loads complete administrative pre-registration detail without internal relation ids", async () => {
  const result = await getMobileAdminPreRegistration(admin, "pre-1", {
    store: {
      studentPreRegistration: {
        findUnique: async () => ({
          address: "Rua Candy, 10",
          assignedTeacherProfile: { user: { name: "Teacher Candy" } },
          birthDate: new Date("2010-05-20T00:00:00.000Z"),
          city: "Ivaté",
          convertedAgendaStudentId: null,
          convertedFinancialStudentId: null,
          convertedStudentProfileId: null,
          convertedUser: null,
          convertedUserId: null,
          createdAt: new Date("2026-08-01T10:00:00.000Z"),
          createdByUser: { name: "Admin Candy", role: "ADMIN" },
          email: "ana@example.com",
          englishGoal: "Conversacao",
          estimatedLevel: "A2",
          fullName: "Ana Candy",
          guardianDocument: "12345678900",
          guardianName: "Maria Candy",
          guardianPhone: "44977777777",
          id: "pre-1",
          installmentsTotal: 12,
          intendedTime: "19:00",
          intendedWeekdayMask: 10,
          notes: "Prefere aulas online",
          paymentDay: 10,
          paymentMethod: "PIX",
          phone: "44999999999",
          reviewedAt: null,
          reviewedByUser: null,
          secondaryContact: "Pai: 44966666666",
          status: "READY_TO_CONVERT",
          statusNote: "Documentos conferidos",
          studentPhone: "44988888888",
          tuitionCents: 35000,
          unit: "IVATE",
          updatedAt: new Date("2026-08-01T12:00:00.000Z"),
        }),
      },
    } as never,
  });

  assert.equal(result.fullName, "Ana Candy");
  assert.deepEqual(result.agenda, {
    complete: true,
    days: ["Seg", "Qua"],
    time: "19:00",
  });
  assert.deepEqual(result.finance, { complete: true });
  assert.equal(result.canConvert, true);
  assert.equal(result.birthDate, "2010-05-20");
  assert.equal(result.guardianDocument, "12345678900");
  assert.equal(JSON.stringify(result).includes("convertedUserId"), false);
});
