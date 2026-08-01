import type { Prisma } from "@/generated/prisma/client";
import { MAINTENANCE_SETTING_KEY } from "@/lib/app-settings";
import type { MobileAuthUser } from "@/lib/mobile-auth/contracts";
import { acquireTransactionAdvisoryLock } from "@/lib/postgres-advisory-lock";
import { getPrisma } from "@/lib/prisma";
import { getStorageUsageBytes } from "@/lib/storage";
import { z } from "zod";

const maintenanceInputSchema = z
  .object({
    confirmChange: z.literal(true),
    enabled: z.boolean(),
    expectedUpdatedAt: z.string().datetime().nullable(),
    operationId: z.string().uuid(),
  })
  .strict();

const maintenanceSettingSelect = {
  key: true,
  updatedAt: true,
  value: true,
} satisfies Prisma.AppSettingSelect;

const maintenanceOperationSelect = {
  actorUserId: true,
  enabled: true,
  expectedUpdatedAt: true,
  operationId: true,
  resultUpdatedAt: true,
} satisfies Prisma.MobileAdminMaintenanceOperationSelect;

type MaintenanceSettingRow = Prisma.AppSettingGetPayload<{
  select: typeof maintenanceSettingSelect;
}>;
type MaintenanceOperationRow = Prisma.MobileAdminMaintenanceOperationGetPayload<{
  select: typeof maintenanceOperationSelect;
}>;

export type MobileAdminOperationsStore = Pick<
  ReturnType<typeof getPrisma>,
  "$transaction" | "appSetting" | "mobileAdminMaintenanceOperation"
>;

type Options = {
  acquireLock?: (
    tx: Prisma.TransactionClient,
    key: string,
  ) => Promise<void>;
  getStorageUsage?: () => Promise<number>;
  now?: () => Date;
  store?: MobileAdminOperationsStore;
};

const STORAGE_USAGE_CACHE_MS = 30_000;
let storageUsageCache: {
  expiresAt: number;
  promise: Promise<number>;
} | null = null;

export class MobileAdminOperationsError extends Error {
  constructor(
    public readonly code:
      | "EDIT_CONFLICT"
      | "INVALID_INPUT"
      | "OPERATION_CONFLICT"
      | "ROLE_FORBIDDEN"
      | "WRITE_CONFLICT",
  ) {
    super(code);
    this.name = "MobileAdminOperationsError";
  }
}

function requireAdmin(actor: MobileAuthUser) {
  if (actor.role !== "ADMIN") {
    throw new MobileAdminOperationsError("ROLE_FORBIDDEN");
  }
}

function serializeMaintenance(setting: MaintenanceSettingRow | null) {
  return {
    enabled: setting?.value === "on",
    updatedAt: setting?.updatedAt.toISOString() ?? null,
  };
}

function safeUsageBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(Math.trunc(value), Number.MAX_SAFE_INTEGER);
}

function assertCompatibleReplay(
  operation: MaintenanceOperationRow,
  actor: MobileAuthUser,
  enabled: boolean,
  expectedUpdatedAt: string | null,
) {
  if (
    operation.actorUserId !== actor.id ||
    operation.enabled !== enabled ||
    (operation.expectedUpdatedAt?.toISOString() ?? null) !== expectedUpdatedAt
  ) {
    throw new MobileAdminOperationsError("OPERATION_CONFLICT");
  }
}

function getCachedStorageUsageBytes() {
  const now = Date.now();
  if (storageUsageCache && storageUsageCache.expiresAt > now) {
    return storageUsageCache.promise;
  }
  const promise = getStorageUsageBytes().catch((error) => {
    if (storageUsageCache?.promise === promise) storageUsageCache = null;
    throw error;
  });
  storageUsageCache = {
    expiresAt: now + STORAGE_USAGE_CACHE_MS,
    promise,
  };
  return promise;
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function getMobileAdminOperations(
  actor: MobileAuthUser,
  options: Options = {},
) {
  requireAdmin(actor);
  const store = options.store ?? getPrisma();
  const [setting, usageBytes] = await Promise.all([
    store.appSetting.findUnique({
      select: maintenanceSettingSelect,
      where: { key: MAINTENANCE_SETTING_KEY },
    }),
    (options.getStorageUsage ?? getCachedStorageUsageBytes)(),
  ]);

  return {
    generatedAt: (options.now?.() ?? new Date()).toISOString(),
    maintenance: serializeMaintenance(setting),
    storage: { usageBytes: safeUsageBytes(usageBytes) },
  };
}

export async function updateMobileAdminMaintenance(
  actor: MobileAuthUser,
  input: unknown,
  options: Options = {},
) {
  requireAdmin(actor);
  const parsed = maintenanceInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new MobileAdminOperationsError("INVALID_INPUT");
  }

  const store = options.store ?? getPrisma();
  const acquireLock = options.acquireLock ?? acquireTransactionAdvisoryLock;

  try {
    const result = await store.$transaction(async (tx) => {
      await acquireLock(tx, "admin-operations:maintenance");

      const prior = await tx.mobileAdminMaintenanceOperation.findUnique({
        select: maintenanceOperationSelect,
        where: { operationId: parsed.data.operationId },
      });
      const current = await tx.appSetting.findUnique({
        select: maintenanceSettingSelect,
        where: { key: MAINTENANCE_SETTING_KEY },
      });

      if (prior) {
        assertCompatibleReplay(
          prior,
          actor,
          parsed.data.enabled,
          parsed.data.expectedUpdatedAt,
        );
        return {
          changed: false,
          maintenance: current,
          replayed: true,
        };
      }

      const currentVersion = current?.updatedAt.toISOString() ?? null;
      if (currentVersion !== parsed.data.expectedUpdatedAt) {
        throw new MobileAdminOperationsError("EDIT_CONFLICT");
      }

      const nextValue = parsed.data.enabled ? "on" : "off";
      let saved = current;
      let changed = false;

      if (current && current.value !== nextValue) {
        const updated = await tx.appSetting.updateMany({
          data: { value: nextValue },
          where: {
            key: MAINTENANCE_SETTING_KEY,
            updatedAt: current.updatedAt,
          },
        });
        if (updated.count !== 1) {
          throw new MobileAdminOperationsError("WRITE_CONFLICT");
        }
        saved = await tx.appSetting.findUnique({
          select: maintenanceSettingSelect,
          where: { key: MAINTENANCE_SETTING_KEY },
        });
        if (!saved) {
          throw new MobileAdminOperationsError("WRITE_CONFLICT");
        }
        changed = true;
      } else if (!current && parsed.data.enabled) {
        saved = await tx.appSetting.create({
          data: { key: MAINTENANCE_SETTING_KEY, value: nextValue },
          select: maintenanceSettingSelect,
        });
        changed = true;
      }

      await tx.mobileAdminMaintenanceOperation.create({
        data: {
          actorUserId: actor.id,
          enabled: parsed.data.enabled,
          expectedUpdatedAt: parsed.data.expectedUpdatedAt
            ? new Date(parsed.data.expectedUpdatedAt)
            : null,
          operationId: parsed.data.operationId,
          resultUpdatedAt: saved?.updatedAt ?? null,
        },
        select: maintenanceOperationSelect,
      });

      return { changed, maintenance: saved, replayed: false };
    });

    return {
      changed: result.changed,
      maintenance: serializeMaintenance(result.maintenance),
      replayed: result.replayed,
    };
  } catch (error) {
    if (error instanceof MobileAdminOperationsError) throw error;
    if (isUniqueConstraintError(error)) {
      throw new MobileAdminOperationsError("WRITE_CONFLICT");
    }
    throw error;
  }
}
