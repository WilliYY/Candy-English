import type { Prisma } from "@/generated/prisma/client";

export async function acquireTransactionAdvisoryLock(
  tx: Prisma.TransactionClient,
  key: string,
) {
  await tx.$queryRaw<Array<{ locked: number }>>`
    WITH acquired AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))
    )
    SELECT 1::integer AS locked
    FROM acquired
  `;
}
