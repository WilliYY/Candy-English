import assert from "node:assert/strict";
import test from "node:test";

import {
  getMobileAdminOperations,
  MobileAdminOperationsError,
  updateMobileAdminMaintenance,
} from "@/lib/mobile-admin-operations";

const admin = {
  email: "admin@candy.example",
  id: "admin-1",
  name: "Admin Candy",
  role: "ADMIN" as const,
};
const operationId = "33333333-3333-4333-8333-333333333333";
const expectedUpdatedAt = "2026-08-01T18:00:00.000Z";

function setting(overrides: Record<string, unknown> = {}) {
  return {
    key: "maintenanceMode",
    updatedAt: new Date(expectedUpdatedAt),
    value: "off",
    ...overrides,
  };
}

test("rejects non-admin operational reads before touching storage or settings", async () => {
  let touched = false;
  await assert.rejects(
    () =>
      getMobileAdminOperations(
        { ...admin, role: "TEACHER" },
        {
          getStorageUsage: async () => (touched = true, 0),
          store: {
            appSetting: {
              findUnique: async () => (touched = true, null),
            },
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminOperationsError &&
      error.code === "ROLE_FORBIDDEN",
  );
  assert.equal(touched, false);
});

test("returns only safe maintenance and aggregate storage status", async () => {
  const result = await getMobileAdminOperations(admin, {
    getStorageUsage: async () => 12_345,
    now: () => new Date("2026-08-01T19:00:00.000Z"),
    store: {
      appSetting: { findUnique: async () => setting() },
    } as never,
  });

  assert.deepEqual(result, {
    generatedAt: "2026-08-01T19:00:00.000Z",
    maintenance: {
      enabled: false,
      updatedAt: expectedUpdatedAt,
    },
    storage: { usageBytes: 12_345 },
  });
  assert.equal("key" in result.maintenance, false);
  assert.equal("path" in result.storage, false);
});

test("represents an absent maintenance setting as disabled without inventing a version", async () => {
  const result = await getMobileAdminOperations(admin, {
    getStorageUsage: async () => 0,
    store: {
      appSetting: { findUnique: async () => null },
    } as never,
  });

  assert.equal(result.maintenance.enabled, false);
  assert.equal(result.maintenance.updatedAt, null);
});

test("rejects an unconfirmed maintenance mutation before opening a transaction", async () => {
  let touched = false;
  await assert.rejects(
    () =>
      updateMobileAdminMaintenance(
        admin,
        {
          confirmChange: false,
          enabled: true,
          expectedUpdatedAt,
          operationId,
        },
        {
          store: {
            $transaction: async () => (touched = true),
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminOperationsError &&
      error.code === "INVALID_INPUT",
  );
  assert.equal(touched, false);
});

test("replays the same maintenance operation but refuses changed intent", async () => {
  const prior = {
    actorUserId: admin.id,
    enabled: true,
    expectedUpdatedAt: new Date(expectedUpdatedAt),
    operationId,
    resultUpdatedAt: new Date("2026-08-01T18:01:00.000Z"),
  };
  const run = (enabled: boolean) =>
    updateMobileAdminMaintenance(
      admin,
      {
        confirmChange: true,
        enabled,
        expectedUpdatedAt,
        operationId,
      },
      {
        acquireLock: async () => undefined,
        store: {
          $transaction: async (callback: (tx: unknown) => unknown) =>
            callback({
              appSetting: { findUnique: async () => setting({ value: "on" }) },
              mobileAdminMaintenanceOperation: {
                findUnique: async () => prior,
              },
            }),
        } as never,
      },
    );

  const replay = await run(true);
  assert.equal(replay.replayed, true);
  assert.equal(replay.maintenance.enabled, true);
  await assert.rejects(
    () => run(false),
    (error: unknown) =>
      error instanceof MobileAdminOperationsError &&
      error.code === "OPERATION_CONFLICT",
  );
});

test("rejects a stale maintenance version without writing", async () => {
  let updated = false;
  await assert.rejects(
    () =>
      updateMobileAdminMaintenance(
        admin,
        {
          confirmChange: true,
          enabled: true,
          expectedUpdatedAt: "2026-08-01T17:00:00.000Z",
          operationId,
        },
        {
          acquireLock: async () => undefined,
          store: {
            $transaction: async (callback: (tx: unknown) => unknown) =>
              callback({
                appSetting: {
                  findUnique: async () => setting(),
                  updateMany: async () => (updated = true, { count: 1 }),
                },
                mobileAdminMaintenanceOperation: {
                  findUnique: async () => null,
                },
              }),
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminOperationsError &&
      error.code === "EDIT_CONFLICT",
  );
  assert.equal(updated, false);
});

test("updates maintenance atomically and records the idempotency operation", async () => {
  let updatedWhere: Record<string, unknown> | undefined;
  let operationData: Record<string, unknown> | undefined;
  const saved = setting({
    updatedAt: new Date("2026-08-01T18:01:00.000Z"),
    value: "on",
  });
  let reads = 0;

  const result = await updateMobileAdminMaintenance(
    admin,
    {
      confirmChange: true,
      enabled: true,
      expectedUpdatedAt,
      operationId,
    },
    {
      acquireLock: async () => undefined,
      store: {
        $transaction: async (callback: (tx: unknown) => unknown) =>
          callback({
            appSetting: {
              findUnique: async () => (++reads === 1 ? setting() : saved),
              updateMany: async (query: { where: Record<string, unknown> }) => {
                updatedWhere = query.where;
                return { count: 1 };
              },
            },
            mobileAdminMaintenanceOperation: {
              create: async (query: { data: Record<string, unknown> }) => {
                operationData = query.data;
                return query.data;
              },
              findUnique: async () => null,
            },
          }),
      } as never,
    },
  );

  assert.equal(result.replayed, false);
  assert.deepEqual(result.maintenance, {
    enabled: true,
    updatedAt: "2026-08-01T18:01:00.000Z",
  });
  assert.deepEqual(updatedWhere, {
    key: "maintenanceMode",
    updatedAt: new Date(expectedUpdatedAt),
  });
  assert.equal(operationData?.actorUserId, admin.id);
  assert.equal(operationData?.enabled, true);
  assert.deepEqual(
    operationData?.expectedUpdatedAt,
    new Date(expectedUpdatedAt),
  );
  assert.equal(operationData?.operationId, operationId);
});

test("returns a write conflict when the version changes during the atomic update", async () => {
  await assert.rejects(
    () =>
      updateMobileAdminMaintenance(
        admin,
        {
          confirmChange: true,
          enabled: true,
          expectedUpdatedAt,
          operationId,
        },
        {
          acquireLock: async () => undefined,
          store: {
            $transaction: async (callback: (tx: unknown) => unknown) =>
              callback({
                appSetting: {
                  findUnique: async () => setting(),
                  updateMany: async () => ({ count: 0 }),
                },
                mobileAdminMaintenanceOperation: {
                  findUnique: async () => null,
                },
              }),
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminOperationsError &&
      error.code === "WRITE_CONFLICT",
  );
});

test("creates the shared setting when maintenance has never been configured", async () => {
  const created = setting({
    updatedAt: new Date("2026-08-01T18:01:00.000Z"),
    value: "on",
  });
  let settingData: Record<string, unknown> | undefined;
  const result = await updateMobileAdminMaintenance(
    admin,
    {
      confirmChange: true,
      enabled: true,
      expectedUpdatedAt: null,
      operationId,
    },
    {
      acquireLock: async () => undefined,
      store: {
        $transaction: async (callback: (tx: unknown) => unknown) =>
          callback({
            appSetting: {
              create: async (query: { data: Record<string, unknown> }) => {
                settingData = query.data;
                return created;
              },
              findUnique: async () => null,
            },
            mobileAdminMaintenanceOperation: {
              create: async (query: { data: Record<string, unknown> }) =>
                query.data,
              findUnique: async () => null,
            },
          }),
      } as never,
    },
  );

  assert.deepEqual(settingData, { key: "maintenanceMode", value: "on" });
  assert.equal(result.changed, true);
  assert.equal(result.maintenance.enabled, true);
});
