import assert from "node:assert/strict";
import test from "node:test";

import { changeAvaUserStatusInTransaction } from "../admin-user-access";

test("simultaneous removals preserve one active administrator", async () => {
  const users = ["one", "two"].map((id) => ({ id, role: "ADMIN", isActive: true, deletedAt: null }));
  let pending = Promise.resolve();
  async function change(id: string) {
    let release!: () => void;
    const tx = {
      $queryRaw: async () => {
        const before = pending;
        pending = new Promise<void>((resolve) => { release = resolve; });
        await before;
      },
      user: {
        findUnique: async ({ where }: { where: { id: string } }) => users.find((user) => user.id === where.id),
        count: async () => users.filter((user) => user.isActive && !user.deletedAt).length,
        updateMany: async ({ where, data }: { where: { id: string }; data: { isActive: boolean } }) => {
          Object.assign(users.find((user) => user.id === where.id)!, data);
          return { count: 1 };
        },
      },
    };
    try {
      return await changeAvaUserStatusInTransaction(tx as never, id, false);
    } finally {
      release?.();
    }
  }
  const results = await Promise.all([change("one"), change("two")]);
  assert.equal(users.filter((user) => user.isActive).length, 1);
  assert.equal(results.filter((result) => result === "UPDATED").length, 1);
  assert.equal(results.filter((result) => result === "LAST_ADMIN").length, 1);
});
