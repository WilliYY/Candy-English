import assert from "node:assert/strict";
import test from "node:test";

import {
  getMobileAdminUser,
  getMobileAdminUsers,
  MobileAdminUsersError,
} from "../mobile-admin-users";

const admin = {
  email: "admin@candy.example",
  id: "admin-1",
  name: "Admin Candy",
  role: "ADMIN" as const,
};

test("rejects non-admin roles before querying users", async () => {
  let queried = false;

  await assert.rejects(
    () =>
      getMobileAdminUsers(
        { ...admin, role: "TEACHER" },
        {},
        {
          store: {
            user: {
              count: async () => (queried = true, 0),
              findMany: async () => (queried = true, []),
            },
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminUsersError &&
      error.code === "ROLE_FORBIDDEN",
  );

  assert.equal(queried, false);
});

test("lists a bounded filtered page without credential fields", async () => {
  let findManyInput: unknown;
  let countInput: unknown;
  const createdAt = new Date("2026-07-01T12:00:00.000Z");

  const result = await getMobileAdminUsers(
    admin,
    { limit: "2", query: "  candy  ", role: "STUDENT", status: "ACTIVE" },
    {
      now: () => new Date("2026-08-01T12:00:00.000Z"),
      store: {
        user: {
          count: async (input: unknown) => (countInput = input, 2),
          findMany: async (input: unknown) => {
            findManyInput = input;
            return [
              {
                createdAt,
                email: "student@candy.example",
                id: "user-1",
                isActive: true,
                name: "Student Candy",
                role: "STUDENT",
                studentProfile: { id: "student-1" },
                teacherProfile: null,
                updatedAt: createdAt,
              },
              {
                createdAt,
                email: "student2@candy.example",
                id: "user-2",
                isActive: true,
                name: "Student Two",
                role: "STUDENT",
                studentProfile: null,
                teacherProfile: null,
                updatedAt: createdAt,
              },
            ];
          },
        },
      } as never,
    },
  );

  assert.equal(result.generatedAt, "2026-08-01T12:00:00.000Z");
  assert.equal(result.total, 2);
  assert.equal(result.nextCursor, null);
  assert.deepEqual(result.items[0], {
    createdAt: createdAt.toISOString(),
    email: "student@candy.example",
    id: "user-1",
    isActive: true,
    name: "Student Candy",
    profileComplete: true,
    role: "STUDENT",
    updatedAt: createdAt.toISOString(),
  });
  assert.equal("passwordHash" in result.items[0], false);
  assert.deepEqual(countInput, {
    where: {
      isActive: true,
      OR: [
        { name: { contains: "candy", mode: "insensitive" } },
        { email: { contains: "candy", mode: "insensitive" } },
      ],
      role: "STUDENT",
    },
  });
  const { select, ...findManyRest } = findManyInput as {
    select: unknown;
    [key: string]: unknown;
  };
  assert.ok(select);
  assert.deepEqual(findManyRest, {
    cursor: undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: undefined,
    take: 3,
    where: (countInput as { where: unknown }).where,
  });
});

test("returns a stable cursor when another page exists", async () => {
  const createdAt = new Date("2026-07-01T12:00:00.000Z");
  const row = (id: string) => ({
    createdAt,
    email: `${id}@candy.example`,
    id,
    isActive: true,
    name: id,
    role: "ADMIN" as const,
    studentProfile: null,
    teacherProfile: null,
    updatedAt: createdAt,
  });

  const result = await getMobileAdminUsers(admin, { limit: 2 }, {
    store: {
      user: {
        count: async () => 3,
        findMany: async () => [row("user-3"), row("user-2"), row("user-1")],
      },
    } as never,
  });

  assert.deepEqual(result.items.map((item) => item.id), ["user-3", "user-2"]);
  assert.equal(result.nextCursor, "user-2");
});

test("returns a safe administrative user detail with profile counts", async () => {
  const createdAt = new Date("2026-07-01T12:00:00.000Z");
  const result = await getMobileAdminUser(admin, "user-1", {
    store: {
      user: {
        findUnique: async () => ({
          address: "Rua Candy, 10",
          createdAt,
          email: "student@candy.example",
          id: "user-1",
          isActive: true,
          name: "Student Candy",
          phone: "11999999999",
          role: "STUDENT",
          studentProfile: {
            _count: { contracts: 1, lessons: 2, submissions: 3 },
            id: "student-1",
            level: "B1",
            teacherAssignments: [
              { teacherProfile: { user: { name: "Teacher Candy" } } },
            ],
          },
          teacherProfile: null,
          updatedAt: createdAt,
        }),
      },
    } as never,
  });

  assert.deepEqual(result.studentProfile, {
    contractsCount: 1,
    id: "student-1",
    lessonsCount: 2,
    level: "B1",
    submissionsCount: 3,
    teacherNames: ["Teacher Candy"],
  });
  assert.equal(result.phone, "11999999999");
  assert.equal("passwordHash" in result, false);
  assert.equal("sessionVersion" in result, false);
});

test("does not leak whether a missing detail belongs to another role", async () => {
  await assert.rejects(
    () =>
      getMobileAdminUser(admin, "missing-user", {
        store: { user: { findUnique: async () => null } } as never,
      }),
    (error: unknown) =>
      error instanceof MobileAdminUsersError &&
      error.code === "USER_NOT_FOUND",
  );
});
