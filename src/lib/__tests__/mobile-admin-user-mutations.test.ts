import assert from "node:assert/strict";
import test from "node:test";

import {
  changeMobileAdminUserStatus,
  createMobileAdminUser,
  MobileAdminUserMutationError,
  updateMobileAdminUser,
} from "../mobile-admin-user-mutations";

const admin = {
  email: "admin@candy.example",
  id: "admin-1",
  name: "Admin Candy",
  role: "ADMIN" as const,
};

test("rejects non-admin user writes before hashing or opening a transaction", async () => {
  let touched = false;

  await assert.rejects(
    () =>
      createMobileAdminUser(
        { ...admin, role: "TEACHER" },
        {
          confirmPassword: "StrongPass123",
          email: "student@example.com",
          name: "Student Candy",
          password: "StrongPass123",
          role: "STUDENT",
        },
        {
          hashPassword: async () => (touched = true, "hash"),
          store: { $transaction: async () => (touched = true) } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminUserMutationError &&
      error.code === "ROLE_FORBIDDEN",
  );

  assert.equal(touched, false);
});

test("creates a student and profile atomically without returning the password", async () => {
  const writes: Array<{ data: unknown; model: string }> = [];
  const tx = {
    studentProfile: {
      create: async ({ data }: { data: unknown }) =>
        writes.push({ data, model: "studentProfile" }),
    },
    teacherProfile: { create: async () => undefined },
    user: {
      create: async ({ data }: { data: unknown }) => {
        writes.push({ data, model: "user" });
        return { id: "user-1" };
      },
    },
  };
  const result = await createMobileAdminUser(
    admin,
    {
      confirmPassword: "StrongPass123",
      email: " Student@Example.com ",
      level: "A2",
      name: " Student Candy ",
      password: "StrongPass123",
      phone: "11999999999",
      role: "STUDENT",
    },
    {
      hashPassword: async (password) => {
        assert.equal(password, "StrongPass123");
        return "secure-hash";
      },
      store: {
        $transaction: async (operation: (value: typeof tx) => unknown) =>
          operation(tx),
      } as never,
    },
  );

  assert.deepEqual(result, {
    message: "Usuario cadastrado com sucesso.",
    userId: "user-1",
  });
  assert.deepEqual(writes, [
    {
      data: {
        address: undefined,
        email: "student@example.com",
        name: "Student Candy",
        passwordHash: "secure-hash",
        phone: "11999999999",
        role: "STUDENT",
      },
      model: "user",
    },
    {
      data: {
        level: "A2",
        studentPhone: "11999999999",
        userId: "user-1",
      },
      model: "studentProfile",
    },
  ]);
  assert.equal(JSON.stringify(result).includes("StrongPass123"), false);
});

test("updates identity and the matching profile with optimistic concurrency", async () => {
  const updatedAt = new Date("2026-08-01T12:00:00.000Z");
  const writes: unknown[] = [];
  const tx = {
    studentProfile: {
      upsert: async (input: unknown) => writes.push(input),
    },
    teacherProfile: { upsert: async () => undefined },
    user: {
      findUnique: async () => ({ id: "user-1", role: "STUDENT", updatedAt }),
      updateMany: async (input: unknown) => (writes.push(input), { count: 1 }),
    },
  };
  const result = await updateMobileAdminUser(
    admin,
    "user-1",
    {
      address: "Rua Candy, 10",
      email: "new@example.com",
      expectedUpdatedAt: updatedAt.toISOString(),
      level: "B1",
      name: "New Name",
      phone: "11988887777",
    },
    {
      store: {
        $transaction: async (operation: (value: typeof tx) => unknown) =>
          operation(tx),
      } as never,
    },
  );

  assert.equal(result.userId, "user-1");
  assert.equal(writes.length, 2);
});

test("refuses to overwrite a user changed by another session", async () => {
  const updatedAt = new Date("2026-08-01T12:00:00.000Z");
  await assert.rejects(
    () =>
      updateMobileAdminUser(
        admin,
        "user-1",
        {
          email: "new@example.com",
          expectedUpdatedAt: updatedAt.toISOString(),
          name: "New Name",
        },
        {
          store: {
            $transaction: async (operation: (value: unknown) => unknown) =>
              operation({
                user: {
                  findUnique: async () => ({
                    id: "user-1",
                    role: "STUDENT",
                    updatedAt,
                  }),
                  updateMany: async () => ({ count: 0 }),
                },
              }),
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminUserMutationError &&
      error.code === "EDIT_CONFLICT",
  );
});

test("refuses to deactivate the authenticated admin", async () => {
  await assert.rejects(
    () =>
      changeMobileAdminUserStatus(
        admin,
        "admin-1",
        {
          confirmStatusChange: true,
          expectedUpdatedAt: "2026-08-01T12:00:00.000Z",
          isActive: false,
        },
        { store: {} as never },
      ),
    (error: unknown) =>
      error instanceof MobileAdminUserMutationError &&
      error.code === "SELF_DEACTIVATION",
  );
});

test("deactivation revokes mobile sessions and increments session version", async () => {
  const updatedAt = new Date("2026-08-01T12:00:00.000Z");
  const writes: Array<{ input: unknown; model: string }> = [];
  const tx = {
    mobileSession: {
      updateMany: async (input: unknown) =>
        writes.push({ input, model: "mobileSession" }),
    },
    user: {
      count: async () => 2,
      findUnique: async () => ({
        id: "user-2",
        isActive: true,
        role: "ADMIN",
        updatedAt,
      }),
      updateMany: async (input: unknown) =>
        (writes.push({ input, model: "user" }), { count: 1 }),
    },
  };
  const result = await changeMobileAdminUserStatus(
    admin,
    "user-2",
    {
      confirmStatusChange: true,
      expectedUpdatedAt: updatedAt.toISOString(),
      isActive: false,
    },
    {
      now: () => new Date("2026-08-01T13:00:00.000Z"),
      store: {
        $transaction: async (operation: (value: typeof tx) => unknown) =>
          operation(tx),
      } as never,
    },
  );

  assert.deepEqual(result, {
    changed: true,
    isActive: false,
    message: "Usuario desativado com sucesso.",
    userId: "user-2",
  });
  assert.deepEqual(writes.map((write) => write.model), ["user", "mobileSession"]);
});

test("keeps at least one active administrator", async () => {
  const updatedAt = new Date("2026-08-01T12:00:00.000Z");
  await assert.rejects(
    () =>
      changeMobileAdminUserStatus(
        admin,
        "admin-2",
        {
          confirmStatusChange: true,
          expectedUpdatedAt: updatedAt.toISOString(),
          isActive: false,
        },
        {
          store: {
            $transaction: async (operation: (value: unknown) => unknown) =>
              operation({
                user: {
                  count: async () => 1,
                  findUnique: async () => ({
                    id: "admin-2",
                    isActive: true,
                    role: "ADMIN",
                    updatedAt,
                  }),
                },
              }),
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminUserMutationError &&
      error.code === "LAST_ACTIVE_ADMIN",
  );
});
