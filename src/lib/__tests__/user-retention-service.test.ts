import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as retention from "../user-retention";

const source = readFileSync(new URL("../user-retention-service.ts", import.meta.url), "utf8");
const now = new Date("2028-11-22T12:00:00Z");
function fixture(options: { change?: "RESTORED" | "RESCHEDULED" | "ANONYMIZED" | "ACTIVE"; repair?: boolean; casLost?: boolean; avatarFailsOnce?: boolean } = {}) {
  let current = {
    id: "fixture-user", isActive: false, anonymizedAt: options.repair ? new Date("2028-11-01T12:00:00Z") : null,
    deletedAt: new Date("2026-11-01T12:00:00Z"), scheduledAnonymizationAt: new Date("2028-11-01T12:00:00Z"),
    avatarPath: "avatars/synthetic.webp" as string | null, email: "synthetic@example.test",
    studentProfile: { id: "profile", agendaStudent: { id: "current-agenda" }, financialStudent: { id: "current-finance" }, convertedStudentPreRegistration: null },
  };
  const scanned = structuredClone(current);
  scanned.studentProfile.agendaStudent.id = "stale-agenda";
  if (options.change === "RESTORED") current.deletedAt = null as never;
  if (options.change === "RESCHEDULED") current.scheduledAnonymizationAt = new Date("2029-11-01T12:00:00Z");
  if (options.change === "ANONYMIZED") current.anonymizedAt = new Date("2028-11-21T12:00:00Z");
  if (options.change === "ACTIVE") current.isActive = true;
  const effects: string[] = [];
  const steps: string[] = [];
  let avatarCalls = 0;
  let historyAgenda: string | undefined;
  const tx: Record<string, unknown> = {
    $queryRaw: async () => { steps.push("lock"); return [{ id: current.id }]; },
    user: {
      findUnique: async () => { steps.push("read"); return structuredClone(current); },
      updateMany: async ({ data }: { data: Record<string, unknown> }) => {
        steps.push("reserve");
        if (options.casLost) return { count: 0 };
        Object.assign(current, data); effects.push("user"); return { count: 1 };
      },
    },
  };
  for (const name of ["mobileDevice", "cattyConversation", "cattyMemoryEvent", "cattyUserMemory", "cattyArtifactEnrichment", "cattyUserArtifact", "loginAttempt", "userMfa", "studentProfile", "teacherProfile", "studentPreRegistration"]) {
    tx[name] = { deleteMany: async () => { effects.push(name); return { count: 1 }; }, updateMany: async () => { effects.push(name); return { count: 1 }; } };
  }
  const store = {
    user: { findMany: async () => [scanned] },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      const snapshot = structuredClone(current); const count = effects.length;
      try { return await callback(tx); } catch (error) { current = snapshot; effects.splice(count); throw error; }
    },
  };
  const dependencies: Record<string, unknown> = {
    "node:crypto": { randomUUID: () => "synthetic-password-input" }, "bcryptjs": { hash: async () => "synthetic-hash" },
    "@/lib/user-retention": retention,
    "@/lib/prisma": { getPrisma: () => store },
    "@/lib/user-retention-history": { anonymizeUserHistoricalReferences: async (_tx: unknown, candidate: typeof current) => { effects.push("history"); historyAgenda = candidate.studentProfile.agendaStudent.id; } },
    "@/lib/storage": { deleteAvatarImage: async () => { steps.push("avatar"); avatarCalls++; if (options.avatarFailsOnce && avatarCalls === 1) throw Error("Synthetic file failure"); } },
  };
  const context = { exports: {}, Date, require: (name: string) => dependencies[name] };
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const action = (context.exports as { anonymizeExpiredUsers: (options: unknown) => Promise<{ anonymized: number; repaired: number; avatarCleanupFailures: number }> }).anonymizeExpiredUsers;
  return { action: () => action({ apply: true, repairAnonymized: options.repair, now }), current: () => current, effects, steps, avatarCalls: () => avatarCalls, historyAgenda: () => historyAgenda };
}

test("normal retention rechecks lost eligibility under the User lock before any effect", async () => {
  for (const change of ["RESTORED", "RESCHEDULED", "ANONYMIZED", "ACTIVE"] as const) {
    const state = fixture({ change });
    const result = await state.action();
    assert.equal(result.anonymized, 0);
    assert.deepEqual(state.effects, []);
    assert.equal(state.avatarCalls(), 0);
  }
});
test("lost compare-and-set reservation has no relation or file effects", async () => {
  for (const repair of [false, true]) {
    const state = fixture({ casLost: true, repair });
    const result = await state.action();
    assert.equal(result.anonymized, 0);
    assert.equal(result.repaired, 0);
    assert.deepEqual(state.effects, []);
    assert.equal(state.avatarCalls(), 0);
  }
});
test("repair mode also rejects restored, active and rescheduled candidates", async () => {
  for (const change of ["RESTORED", "RESCHEDULED", "ACTIVE"] as const) {
    const state = fixture({ change, repair: true });
    assert.equal((await state.action()).repaired, 0);
    assert.deepEqual(state.effects, []);
    assert.equal(state.avatarCalls(), 0);
  }
});
test("retention uses current links after locking and only deletes avatar after reservation", async () => {
  const state = fixture();
  assert.equal((await state.action()).anonymized, 1);
  assert.equal(state.historyAgenda(), "current-agenda");
  assert.deepEqual(state.steps.slice(0, 4), ["lock", "read", "reserve", "avatar"]);
  assert.equal((await state.action()).anonymized, 0);
  assert.equal(state.avatarCalls(), 1);
});
test("avatar deletion failure rolls back reservation and remains recoverable on the next run", async () => {
  for (const repair of [false, true]) {
    const state = fixture({ avatarFailsOnce: true, repair });
    const before = structuredClone(state.current());
    assert.equal((await state.action()).avatarCleanupFailures, 1);
    assert.deepEqual(state.current(), before);
    assert.deepEqual(state.effects, []);
    const second = await state.action();
    assert.equal(repair ? second.repaired : second.anonymized, 1);
    assert.equal(state.avatarCalls(), 2);
  }
});
