import assert from "node:assert/strict";
import test from "node:test";

import { redactCattyMemoryInTransaction, redactRemovedCattyMemoryEvent } from "../catty-memory-redaction";

test("sensitive removal clears edited history while preserving action, date and author", async () => {
  const events = ["CREATED", "VALUE_UPDATED"].map((action) => ({ action, createdAt: "2026-01-01", createdByUserId: "admin", previousValue: "private-old", nextValue: "private-new", note: "private-note", key: "private-key" }));
  const memory = { id: "memory", category: "NOTE", key: "private-key", source: "ADMIN_NOTE", userId: "student", value: "private-new" };
  const tx = {
    cattyUserMemory: { update: async ({ data }: { data: object }) => Object.assign(memory, data) },
    cattyMemoryEvent: {
      updateMany: async ({ data }: { data: object }) => events.forEach((event) => Object.assign(event, data)),
      create: async ({ data }: { data: object }) => events.push(data as typeof events[number]),
    },
  };
  await redactCattyMemoryInTransaction(tx as never, memory as never, "admin");
  assert.equal(memory.value, "[dado sensivel removido]");
  assert.equal(memory.key, "removed_memory");
  assert.equal(events[0].action, "CREATED");
  assert.equal(events[0].createdByUserId, "admin");
  assert.equal(events[0].createdAt, "2026-01-01");
  assert.ok(!JSON.stringify(events).includes("private-"));
  assert.equal(events.at(-1)?.action, "SENSITIVE_REMOVED");
});

test("management projection masks legacy events for previously removed memories", () => {
  const event = { action: "VALUE_UPDATED", previousValue: "old", nextValue: "new", note: "private" };
  assert.deepEqual(redactRemovedCattyMemoryEvent("[dado sensivel removido]", event), { action: "VALUE_UPDATED", previousValue: null, nextValue: null, note: null });
  assert.deepEqual(redactRemovedCattyMemoryEvent("safe interest", event), event);
});
