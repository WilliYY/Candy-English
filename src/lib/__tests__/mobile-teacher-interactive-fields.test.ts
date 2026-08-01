import assert from "node:assert/strict";
import test from "node:test";

import {
  getMobileTeacherInteractiveFields,
  updateMobileTeacherInteractiveFields,
  type MobileTeacherInteractiveFieldStore,
} from "../mobile-teacher-interactive-fields";

const updatedAt = new Date("2026-08-01T18:00:00.000Z");
const operationId = "11111111-1111-4111-8111-111111111111";

function asStore(value: unknown) {
  return value as MobileTeacherInteractiveFieldStore;
}

function profileStore(extra: Record<string, unknown>) {
  const store: Record<string, unknown> = {
    $queryRaw: async () => [{ pg_advisory_xact_lock: null }],
    teacherProfile: { findUnique: async () => ({ id: "teacher-1" }) },
    ...extra,
  };
  if (!("$transaction" in store)) {
    store.$transaction = async (callback: (tx: unknown) => unknown) =>
      callback(store);
  }
  return asStore(store);
}

function field(overrides: Record<string, unknown> = {}) {
  return {
    height: 4,
    id: "field-1",
    label: "Answer",
    page: 1,
    placeholder: "Type here",
    required: true,
    sortOrder: 0,
    type: "LONG_TEXT",
    width: 80,
    x: 10,
    y: 15,
    ...overrides,
  };
}

function homework(overrides: Record<string, unknown> = {}) {
  return {
    _count: { submissions: 0 },
    assetFileName: "activity.pdf",
    assetPageCount: 2,
    fieldDetectionSource: "manual",
    id: "homework-1",
    interactiveFields: [field()],
    kind: "INTERACTIVE",
    lastMobileOperationId: null,
    title: "Interactive activity",
    updatedAt,
    ...overrides,
  };
}

const baseInput = {
  expectedUpdatedAt: updatedAt.toISOString(),
  fields: [
    {
      height: 1,
      id: "field-1",
      label: "Listen",
      page: 1,
      placeholder: "  How   are you?  ",
      required: true,
      type: "LISTENING" as const,
      width: 2,
      x: 99,
      y: 99,
    },
    {
      height: 6,
      id: null,
      label: "Draw",
      page: 2,
      placeholder: null,
      required: true,
      type: "DRAWING" as const,
      width: 20,
      x: 5,
      y: 30,
    },
  ],
  operationId,
};

test("rejects invalid fields before querying the teacher profile", async () => {
  let profileCalls = 0;
  const store = asStore({
    teacherProfile: {
      findUnique: async () => {
        profileCalls += 1;
        return { id: "teacher-1" };
      },
    },
  });
  const result = await updateMobileTeacherInteractiveFields(
    "teacher-user",
    "homework-1",
    { ...baseInput, fields: [{ ...baseInput.fields[0], page: 21 }] },
    { store },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "INVALID");
  assert.equal(profileCalls, 0);
});

test("loads only an owned interactive homework with its ordered fields", async () => {
  let query: unknown;
  const store = profileStore({
    homework: {
      findFirst: async (args: unknown) => {
        query = args;
        return homework();
      },
    },
  });
  const result = await getMobileTeacherInteractiveFields(
    "teacher-user",
    "homework-1",
    { store },
  );

  assert.equal(result.ok, true);
  assert.equal(result.data?.pageCount, 2);
  assert.equal(result.data?.fields[0]?.id, "field-1");
  assert.deepEqual((query as { where: unknown }).where, {
    id: "homework-1",
    kind: "INTERACTIVE",
    teacherProfileId: "teacher-1",
  });
});

test("refuses an editor response above the safe field limit", async () => {
  const store = profileStore({
    homework: {
      findFirst: async () =>
        homework({
          interactiveFields: Array.from({ length: 121 }, (_, index) =>
            field({ id: `field-${index}`, sortOrder: index }),
          ),
        }),
    },
  });
  const result = await getMobileTeacherInteractiveFields(
    "teacher-user",
    "homework-1",
    { store },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "LIMIT_EXCEEDED");
});

test("updates, creates and removes fields atomically with normalized geometry", async () => {
  const calls: Record<string, unknown> = {};
  const confirmedAt = new Date("2026-08-01T18:01:00.000Z");
  const store = profileStore({
    $queryRaw: async (_strings: TemplateStringsArray, lockKey: string) => {
      calls.lockKey = lockKey;
      return [{ locked: 1 }];
    },
    homework: {
      findFirst: async () => homework(),
      findUnique: async () =>
        homework({
          interactiveFields: [
            field({
              height: 1.6,
              label: "Listen",
              placeholder: "How are you?",
              required: false,
              type: "LISTENING",
              width: 4,
              x: 96,
              y: 98.4,
            }),
            field({ id: "field-new", label: "Draw", page: 2, sortOrder: 1 }),
          ],
          updatedAt: confirmedAt,
        }),
      updateMany: async (args: unknown) => {
        calls.homeworkUpdate = args;
        return { count: 1 };
      },
    },
    homeworkInteractiveField: {
      create: async (args: unknown) => {
        calls.create = args;
      },
      deleteMany: async (args: unknown) => {
        calls.deleteMany = args;
      },
      update: async (args: unknown) => {
        calls.update = args;
      },
    },
  });

  const result = await updateMobileTeacherInteractiveFields(
    "teacher-user",
    "homework-1",
    baseInput,
    { store },
  );

  assert.equal(result.ok, true);
  assert.equal(result.data?.updatedAt, confirmedAt.toISOString());
  assert.equal(calls.lockKey, "homework-structure:homework-1");
  assert.deepEqual((calls.homeworkUpdate as { where: unknown }).where, {
    id: "homework-1",
    teacherProfileId: "teacher-1",
    updatedAt,
  });
  assert.deepEqual((calls.deleteMany as { where: unknown }).where, {
    homeworkId: "homework-1",
    id: { notIn: ["field-1"] },
  });
  assert.deepEqual((calls.update as { data: unknown }).data, {
    height: 1.6,
    label: "Listen",
    page: 1,
    placeholder: "How are you?",
    required: false,
    sortOrder: 0,
    type: "LISTENING",
    width: 4,
    x: 96,
    y: 98.4,
  });
  assert.equal(
    (calls.create as { data: { homeworkId: string } }).data.homeworkId,
    "homework-1",
  );
});

test("locks structural field edits after the first submission", async () => {
  let writes = 0;
  const store = profileStore({
    homework: {
      findFirst: async () => homework({ _count: { submissions: 1 } }),
      updateMany: async () => {
        writes += 1;
      },
    },
  });
  const result = await updateMobileTeacherInteractiveFields(
    "teacher-user",
    "homework-1",
    baseInput,
    { store },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "FIELDS_LOCKED");
  assert.equal(writes, 0);
});

test("detects a stale editor version before changing fields", async () => {
  const store = profileStore({
    homework: {
      findFirst: async () =>
        homework({ updatedAt: new Date("2026-08-01T18:02:00.000Z") }),
    },
  });
  const result = await updateMobileTeacherInteractiveFields(
    "teacher-user",
    "homework-1",
    baseInput,
    { store },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "CONFLICT");
});

test("replays a completed field operation without writing again", async () => {
  let writes = 0;
  const store = profileStore({
    homework: {
      findFirst: async () =>
        homework({ lastMobileOperationId: `homework:fields:${operationId}` }),
      updateMany: async () => {
        writes += 1;
      },
    },
  });
  const result = await updateMobileTeacherInteractiveFields(
    "teacher-user",
    "homework-1",
    baseInput,
    { store },
  );

  assert.equal(result.ok, true);
  assert.equal(result.data?.replayed, true);
  assert.equal(writes, 0);
});
