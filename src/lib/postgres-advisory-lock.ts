import type { Prisma } from "@/generated/prisma/client";

export async function acquireTransactionAdvisoryLock(
  tx: Prisma.TransactionClient,
  key: string,
) {
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))
  `;
}
