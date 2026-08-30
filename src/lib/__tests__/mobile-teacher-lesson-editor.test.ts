import assert from "node:assert/strict";
import test from "node:test";

import {
  createMobileTeacherLesson,
  getMobileTeacherLessonEditor,
  getMobileTeacherLessonOptions,
  type MobileTeacherLessonEditorStore,
  updateMobileTeacherLesson,
} from "@/lib/mobile-teacher-lesson-editor";

const createdAt = new Date("2026-08-01T12:00:00.000Z");
const updatedAt = new Date("2026-08-01T13:00:00.000Z");

const baseInput = {
  description: "Practice a friendly introduction.",
  materials: [
    {
      content: "Open the speaking guide.",
      title: "Practice guide",
      type: "LINK" as const,
      url: "https://candy.example/material",
    },
  ],
  operationId: "11111111-1111-4111-8111-111111111111",
  scheduledAt: "2026-08-05T12:00:00.000Z",
  status: "DRAFT" as const,
  studentProfileId: "student-1",
  title: "Introductions",
  vocabularyItems: [
    {
      example: "Nice to meet you.",
      term: "meet",
      translation: "conhecer",
    },
  ],
};

type StoreOptions = {
  editorMaterialCount?: number;
  editorExists?: boolean;
  profileId?: string | null;
  replayCreate?: boolean;
  replayUpdate?: boolean;
  transactionErrorCode?: string;
  updateCount?: number;
};

function createStore(options: StoreOptions = {}) {
  const calls: Record<string, unknown> = {};
  const tx = {
    lesson: {
      create: async (args: unknown) => {
        calls.create = args;
        return { id: "lesson-new", updatedAt: createdAt };
      },
      findFirst: async (args: unknown) => {
        calls.transactionLessonFindFirst = args;
        if (options.editorExists === false) {
          return null;
        }

        return {
          id: "lesson-1",
          lastMobileOperationId: options.replayUpdate
            ? "22222222-2222-4222-8222-222222222222"
            : "another-operation",
          updatedAt,
        };
      },
      findUnique: async (args: unknown) => {
        calls.transactionLessonFindUnique = args;
        const query = args as { where?: Record<string, unknown> };
        if (query.where?.id) {
          return { id: "lesson-1", updatedAt };
        }

        if (options.replayCreate) {
          return {
            id: "lesson-replayed",
            teacherProfileId: "teacher-1",
            updatedAt,
          };
        }

        return null;
      },
      updateMany: async (args: unknown) => {
        calls.updateMany = args;
        return { count: options.updateCount ?? 1 };
      },
    },
    lessonMaterial: {
      createMany: async (args: unknown) => {
        calls.materialCreateMany = args;
        return { count: 1 };
      },
      deleteMany: async (args: unknown) => {
        calls.materialDeleteMany = args;
        return { count: 1 };
      },
    },
    studentProfile: {
      findFirst: async (args: unknown) => {
        calls.student = args;
        return { id: "student-1" };
      },
    },
    vocabularyItem: {
      createMany: async (args: unknown) => {
        calls.vocabularyCreateMany = args;
        return { count: 1 };
      },
      deleteMany: async (args: unknown) => {
        calls.vocabularyDeleteMany = args;
        return { count: 1 };
      },
    },
  };
  const store = {
    $transaction: async (callback: (transaction: typeof tx) => unknown) => {
      if (options.transactionErrorCode) {
        throw { code: options.transactionErrorCode };
      }

      return callback(tx);
    },
    lesson: {
      findFirst: async (args: unknown) => {
        calls.editorLesson = args;
        if (options.editorExists === false) {
          return null;
        }

        return {
          description: baseInput.description,
          id: "lesson-1",
          materials: Array.from(
            { length: options.editorMaterialCount ?? baseInput.materials.length },
            (_, index) => ({
              ...baseInput.materials[0]!,
              id: `material-${index + 1}`,
            }),
          ),
          scheduledAt: new Date(baseInput.scheduledAt),
          status: baseInput.status,
          studentProfileId: baseInput.studentProfileId,
          title: baseInput.title,
          updatedAt,
          vocabularyItems: baseInput.vocabularyItems.map((item, index) => ({
            ...item,
            id: `word-${index + 1}`,
          })),
        };
      },
    },
    studentProfile: {
      findMany: async (args: unknown) => {
        calls.options = args;
        return [
          {
            id: "student-1",
            level: "A2",
            user: { name: "Candy Student" },
          },
        ];
      },
    },
    teacherProfile: {
      findUnique: async (args: unknown) => {
        calls.profile = args;
        return options.profileId === null
          ? null
          : { id: options.profileId ?? "teacher-1" };
      },
    },
  } as unknown as MobileTeacherLessonEditorStore;

  return { calls, store };
}

test("rejects invalid or unsafe lesson input before querying profiles", async () => {
  const { calls, store } = createStore();
  const result = await createMobileTeacherLesson(
    "teacher-user",
    {
      ...baseInput,
      materials: [
        {
          content: null,
          title: "Unsafe",
          type: "LINK",
          url: "https://user:password@candy.example/private",
        },
      ],
    },
    { store },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "INVALID");
  assert.equal(calls.profile, undefined);
});

test("creates a lesson for any active student", async () => {
  const { calls, store } = createStore();
  const result = await createMobileTeacherLesson(
    "teacher-user",
    baseInput,
    { store },
  );

  assert.deepEqual(calls.student, {
    select: { id: true },
    where: {
      id: "student-1",
      user: {
        deletedAt: null,
        isActive: true,
        role: "STUDENT",
      },
    },
  });
  assert.deepEqual(result, {
    data: {
      lessonId: "lesson-new",
      replayed: false,
      updatedAt: createdAt.toISOString(),
    },
    message: "Aula criada com sucesso.",
    ok: true,
  });
  assert.deepEqual(calls.create, {
    data: {
      createdByMobileOperationId: baseInput.operationId,
      description: baseInput.description,
      lastMobileOperationId: baseInput.operationId,
      materials: {
        create: [
          {
            content: "Open the speaking guide.",
            sortOrder: 0,
            title: "Practice guide",
            type: "LINK",
            url: "https://candy.example/material",
          },
        ],
      },
      scheduledAt: new Date(baseInput.scheduledAt),
      status: "DRAFT",
      studentProfileId: "student-1",
      teacherProfileId: "teacher-1",
      title: "Introductions",
      vocabularyItems: {
        create: [
          {
            example: "Nice to meet you.",
            sortOrder: 0,
            term: "meet",
            translation: "conhecer",
          },
        ],
      },
    },
    select: { id: true, updatedAt: true },
  });
});

test("replays the same create operation without duplicating the lesson", async () => {
  const { calls, store } = createStore({ replayCreate: true });
  const result = await createMobileTeacherLesson(
    "teacher-user",
    baseInput,
    { store },
  );

  assert.equal(result.ok, true);
  assert.equal(result.data?.lessonId, "lesson-replayed");
  assert.equal(result.data?.replayed, true);
  assert.equal(calls.create, undefined);
  assert.equal(calls.student, undefined);
});

test("creates a lesson for an active student without teacher assignment", async () => {
  const { calls, store } = createStore();
  const result = await createMobileTeacherLesson(
    "teacher-user",
    baseInput,
    { store },
  );

  assert.equal(result.ok, true);
  assert.ok(calls.create);
  assert.ok(calls.student);
});

test("updates one owned lesson atomically and replaces editor collections", async () => {
  const { calls, store } = createStore();
  const result = await updateMobileTeacherLesson(
    "teacher-user",
    "lesson-1",
    {
      ...baseInput,
      expectedUpdatedAt: updatedAt.toISOString(),
      operationId: "22222222-2222-4222-8222-222222222222",
    },
    { store },
  );

  assert.equal(result.ok, true);
  assert.equal(result.data?.replayed, false);
  assert.deepEqual(calls.updateMany, {
    data: {
      description: baseInput.description,
      lastMobileOperationId: "22222222-2222-4222-8222-222222222222",
      scheduledAt: new Date(baseInput.scheduledAt),
      status: "DRAFT",
      studentProfileId: "student-1",
      title: "Introductions",
    },
    where: {
      id: "lesson-1",
      teacherProfileId: "teacher-1",
      updatedAt,
    },
  });
  assert.deepEqual(calls.materialDeleteMany, {
    where: { lessonId: "lesson-1" },
  });
  assert.deepEqual(calls.vocabularyDeleteMany, {
    where: { lessonId: "lesson-1" },
  });
});

test("returns an edit conflict instead of overwriting a newer lesson", async () => {
  const { calls, store } = createStore({ updateCount: 0 });
  const result = await updateMobileTeacherLesson(
    "teacher-user",
    "lesson-1",
    {
      ...baseInput,
      expectedUpdatedAt: updatedAt.toISOString(),
      operationId: "22222222-2222-4222-8222-222222222222",
    },
    { store },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "CONFLICT");
  assert.equal(calls.materialDeleteMany, undefined);
});

test("replays the last update operation safely", async () => {
  const { calls, store } = createStore({ replayUpdate: true });
  const result = await updateMobileTeacherLesson(
    "teacher-user",
    "lesson-1",
    {
      ...baseInput,
      expectedUpdatedAt: updatedAt.toISOString(),
      operationId: "22222222-2222-4222-8222-222222222222",
    },
    { store },
  );

  assert.equal(result.ok, true);
  assert.equal(result.data?.replayed, true);
  assert.equal(calls.updateMany, undefined);
});

test("reports a reused update operation instead of returning a server error", async () => {
  const { store } = createStore({ transactionErrorCode: "P2002" });
  const result = await updateMobileTeacherLesson(
    "teacher-user",
    "lesson-1",
    {
      ...baseInput,
      expectedUpdatedAt: updatedAt.toISOString(),
      operationId: "22222222-2222-4222-8222-222222222222",
    },
    { store },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "OPERATION_CONFLICT");
});

test("loads editor data only from the authenticated teacher lesson", async () => {
  const { calls, store } = createStore();
  const result = await getMobileTeacherLessonEditor(
    "teacher-user",
    "lesson-1",
    { store },
  );

  assert.equal(result.ok, true);
  assert.equal(result.data?.updatedAt, updatedAt.toISOString());
  const query = calls.editorLesson as {
    select: Record<string, unknown>;
    where: Record<string, unknown>;
  };
  assert.deepEqual(query.where, {
    id: "lesson-1",
    teacherProfileId: "teacher-1",
  });
  assert.deepEqual(Object.keys(query.select).sort(), [
    "description",
    "id",
    "materials",
    "scheduledAt",
    "status",
    "studentProfileId",
    "title",
    "updatedAt",
    "vocabularyItems",
  ]);
});

test("refuses to truncate an oversized existing lesson in the editor", async () => {
  const { store } = createStore({ editorMaterialCount: 26 });
  const result = await getMobileTeacherLessonEditor(
    "teacher-user",
    "lesson-1",
    { store },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "LIMIT_EXCEEDED");
});

test("lists every active student for the authenticated teacher", async () => {
  const { calls, store } = createStore();
  const result = await getMobileTeacherLessonOptions("teacher-user", { store });

  assert.deepEqual(result, {
    data: {
      students: [
        { id: "student-1", level: "A2", name: "Candy Student" },
      ],
    },
    message: "Opcoes da aula carregadas.",
    ok: true,
  });
  assert.deepEqual(calls.options, {
    orderBy: { user: { name: "asc" } },
    select: {
      id: true,
      level: true,
      user: { select: { name: true } },
    },
    take: 100,
    where: {
      user: {
        deletedAt: null,
        isActive: true,
        role: "STUDENT",
      },
    },
  });
});
