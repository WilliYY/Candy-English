import type { Prisma } from "@/generated/prisma/client";

export const REMOVED_CATTY_MEMORY_VALUE = "[dado sensivel removido]";

export function redactRemovedCattyMemoryEvent<T extends {
  nextValue: string | null;
  note: string | null;
  previousValue: string | null;
}>(value: string, event: T): T {
  return value === REMOVED_CATTY_MEMORY_VALUE
    ? { ...event, nextValue: null, note: null, previousValue: null }
    : event;
}

export async function redactCattyMemoryInTransaction(
  tx: Prisma.TransactionClient,
  memory: { id: string; category: Prisma.CattyMemoryEventCreateInput["category"]; source: Prisma.CattyMemoryEventCreateInput["source"]; userId: string },
  actorUserId: string,
) {
  const updated = await tx.cattyUserMemory.update({
    data: {
      confidence: 0,
      flaggedReason: "Dado sensivel removido por revisao humana.",
      key: `removed_${memory.id}`,
      status: "ARCHIVED",
      value: REMOVED_CATTY_MEMORY_VALUE,
    },
    where: { id: memory.id },
  });
  await tx.cattyMemoryEvent.updateMany({
    data: { key: null, nextValue: null, note: null, previousValue: null },
    where: { memoryId: memory.id },
  });
  await tx.cattyMemoryEvent.create({
    data: {
      action: "SENSITIVE_REMOVED",
      category: memory.category,
      createdByUserId: actorUserId,
      memoryId: memory.id,
      source: memory.source,
      status: "ARCHIVED",
      userId: memory.userId,
    },
  });
  return updated;
}
