import type { Prisma } from "@/generated/prisma/client";
import { acquireTransactionAdvisoryLock } from "@/lib/postgres-advisory-lock";

export const ADMIN_USER_ACCESS_LOCK = "admin-user-access";

export async function changeAvaUserStatusInTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  isActive: boolean,
) {
  await acquireTransactionAdvisoryLock(tx, ADMIN_USER_ACCESS_LOCK);
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { deletedAt: true, id: true, isActive: true, role: true },
  });
  if (!user || user.deletedAt) return "NOT_AVAILABLE" as const;
  if (user.role === "ADMIN" && user.isActive && !isActive) {
    const activeAdmins = await tx.user.count({
      where: { deletedAt: null, isActive: true, role: "ADMIN" },
    });
    if (activeAdmins <= 1) return "LAST_ADMIN" as const;
  }
  await tx.user.updateMany({
    where: { deletedAt: null, id: user.id },
    data: { isActive, sessionVersion: { increment: 1 } },
  });
  return "UPDATED" as const;
}
