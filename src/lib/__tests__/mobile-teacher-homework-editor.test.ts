import assert from "node:assert/strict";
import test from "node:test";

import {
  createMobileTeacherHomework,
  deleteMobileTeacherHomework,
  duplicateMobileTeacherHomework,
  getMobileTeacherHomeworkEditor,
  getMobileTeacherHomeworkOptions,
  updateMobileTeacherHomework,
  type MobileTeacherHomeworkEditorStore,
} from "../mobile-teacher-homework-editor";

const updatedAt = new Date("2026-08-01T15:00:00.000Z");
const baseInput = {
  dueDate: "2026-08-10T18:00:00.000Z",
  instructions: "Answer in English.",
  lessonId: "lesson-1",
  operationId: "11111111-1111-4111-8111-111111111111",
  questions: [{ expectedAnswer: "I am fine.", prompt: "How are you?" }],
  status: "DRAFT" as const,
  studentProfileIds: ["student-1"],
  title: "Daily conversation",
};

function asStore(value: unknown) {
  return value as MobileTeacherHomeworkEditorStore;
}

function profileStore(extra: Record<string, unknown>) {
  const store: Record<string, unknown> = {
    teacherProfile: {
      findUnique: async () => ({ id: "teacher-1" }),
    },
    ...extra,
  };
  if (!("$transaction" in store)) {
    store.$transaction = async (callback: (tx: unknown) => unknown) =>
      callback(store);
  }
  return asStore(store);
}

test("rejects invalid homework input before querying the teacher profile", async () => {
  let profileCalls = 0;
  const store = asStore({
    teacherProfile: {
      findUnique: async () => {
        profileCalls += 1;
        return { id: "teacher-1" };
      },
    },
  });
  const result = await createMobileTeacherHomework(
    "teacher-user",
    { ...baseInput, questions: [] },
    { store },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "INVALID");
  assert.equal(profileCalls, 0);
});

test("creates a text homework inside an owned lesson for any active student", async () => {
  const calls: Record<string, unknown> = {};
  const store = profileStore({
    homework: {
      create: async (args: unknown) => {
        calls.create = args;
        return { id: "homework-new", teacherProfileId: "teacher-1", updatedAt };
      },
      findUnique: async () => null,
    },
    lesson: {
      findFirst: async (args: unknown) => {
        calls.lesson = args;
        return { id: "lesson-1" };
      },
    },
    studentProfile: {
      findMany: async (args: unknown) => {
        calls.assignments = args;
        return [{ id: "student-1" }];
      },
    },
  });

  const result = await createMobileTeacherHomework("teacher-user", baseInput, {
    store,
  });

  assert.equal(result.ok, true);
  assert.equal(result.data?.homeworkId, "homework-new");
  assert.equal(result.data?.replayed, false);
  assert.deepEqual(calls.lesson, {
    where: { id: "lesson-1", teacherProfileId: "teacher-1" },
    select: { id: true },
  });
  assert.deepEqual(
    (calls.create as { data: Record<string, unknown> }).data,
    {
      createdByMobileOperationId: `homework:create:${baseInput.operationId}`,
      dueDate: new Date(baseInput.dueDate),
      instructions: baseInput.instructions,
      kind: "TEXT",
      lessonId: "lesson-1",
      questions: {
        create: [
          {
            expectedAnswer: "I am fine.",
            prompt: "How are you?",
            sortOrder: 0,
          },
        ],
      },
      status: "DRAFT",
      studentAssignments: {
        create: [
          {
            assignedByTeacherProfileId: "teacher-1",
            studentProfileId: "student-1",
          },
        ],
      },
      teacherProfileId: "teacher-1",
      title: "Daily conversation",
    },
  );
});

test("rejects students that are missing or inactive", async () => {
  let createCalls = 0;
  const store = profileStore({
    homework: {
      create: async () => {
        createCalls += 1;
      },
      findUnique: async () => null,
    },
    lesson: { findFirst: async () => ({ id: "lesson-1" }) },
    studentProfile: { findMany: async () => [] },
  });
  const result = await createMobileTeacherHomework("teacher-user", baseInput, {
    store,
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "STUDENT_FORBIDDEN");
  assert.equal(createCalls, 0);
});

test("updates text metadata and questions with an atomic version condition", async () => {
  const calls: Record<string, unknown> = {};
  const confirmedAt = new Date("2026-08-01T15:01:00.000Z");
  const store = profileStore({
    homework: {
      findFirst: async () => ({
        _count: { submissions: 0 },
        id: "homework-1",
        kind: "TEXT",
        lastMobileOperationId: null,
        studentAssignments: [{ studentProfileId: "student-1" }],
        updatedAt,
      }),
      findUnique: async () => ({ id: "homework-1", updatedAt: confirmedAt }),
      updateMany: async (args: unknown) => {
        calls.update = args;
        return { count: 1 };
      },
    },
    homeworkQuestion: {
      createMany: async (args: unknown) => {
        calls.questionCreate = args;
        return { count: 1 };
      },
      deleteMany: async (args: unknown) => {
        calls.questionDelete = args;
        return { count: 1 };
      },
    },
    homeworkStudentAssignment: {
      createMany: async () => ({ count: 0 }),
      deleteMany: async () => ({ count: 0 }),
    },
    lesson: { findFirst: async () => ({ id: "lesson-1" }) },
    studentProfile: {
      findMany: async () => [{ id: "student-1" }],
    },
  });

  const operationId = "22222222-2222-4222-8222-222222222222";
  const result = await updateMobileTeacherHomework(
    "teacher-user",
    "homework-1",
    { ...baseInput, expectedUpdatedAt: updatedAt.toISOString(), operationId },
    { store },
  );

  assert.equal(result.ok, true);
  assert.equal(result.data?.updatedAt, confirmedAt.toISOString());
  assert.deepEqual(
    (calls.update as { where: Record<string, unknown> }).where,
    {
      id: "homework-1",
      teacherProfileId: "teacher-1",
      updatedAt,
    },
  );
  assert.deepEqual(calls.questionDelete, { where: { homeworkId: "homework-1" } });
  assert.deepEqual(calls.questionCreate, {
    data: [
      {
        expectedAnswer: "I am fine.",
        homeworkId: "homework-1",
        prompt: "How are you?",
        sortOrder: 0,
      },
    ],
  });
});

test("returns a conflict before replacing data when the version is stale", async () => {
  let updateCalls = 0;
  const store = profileStore({
    homework: {
      findFirst: async () => ({
        _count: { submissions: 0 },
        id: "homework-1",
        kind: "TEXT",
        lastMobileOperationId: null,
        studentAssignments: [{ studentProfileId: "student-1" }],
        updatedAt,
      }),
      updateMany: async () => {
        updateCalls += 1;
        return { count: 1 };
      },
    },
  });
  const result = await updateMobileTeacherHomework(
    "teacher-user",
    "homework-1",
    {
      ...baseInput,
      expectedUpdatedAt: "2026-08-01T14:00:00.000Z",
      operationId: "22222222-2222-4222-8222-222222222222",
    },
    { store },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "CONFLICT");
  assert.equal(updateCalls, 0);
});

test("updates interactive metadata without replacing protected fields", async () => {
  let questionWrites = 0;
  const confirmedAt = new Date("2026-08-01T15:02:00.000Z");
  const store = profileStore({
    homework: {
      findFirst: async () => ({
        _count: { submissions: 0 },
        id: "homework-interactive",
        kind: "INTERACTIVE",
        lastMobileOperationId: null,
        lesson: { studentProfileId: "student-1" },
        studentAssignments: [{ studentProfileId: "student-1" }],
        updatedAt,
      }),
      findUnique: async () => ({
        id: "homework-interactive",
        updatedAt: confirmedAt,
      }),
      updateMany: async () => ({ count: 1 }),
    },
    homeworkQuestion: {
      createMany: async () => void (questionWrites += 1),
      deleteMany: async () => void (questionWrites += 1),
    },
    homeworkStudentAssignment: {
      createMany: async () => ({ count: 0 }),
      deleteMany: async () => ({ count: 0 }),
    },
    lesson: { findFirst: async () => ({ id: "lesson-1" }) },
    studentProfile: {
      findMany: async () => [{ id: "student-1" }],
    },
  });
  const result = await updateMobileTeacherHomework(
    "teacher-user",
    "homework-interactive",
    {
      ...baseInput,
      expectedUpdatedAt: updatedAt.toISOString(),
      operationId: "22222222-2222-4222-8222-222222222222",
      questions: [],
    },
    { store },
  );

  assert.equal(result.ok, true);
  assert.equal(questionWrites, 0);
});

test("locks assignment changes after a student has submitted", async () => {
  const store = profileStore({
    homework: {
      findFirst: async () => ({
        _count: { submissions: 1 },
        id: "homework-1",
        kind: "TEXT",
        lastMobileOperationId: null,
        studentAssignments: [{ studentProfileId: "student-1" }],
        updatedAt,
      }),
    },
    lesson: { findFirst: async () => ({ id: "lesson-1" }) },
    studentProfile: {
      findMany: async () => [{ id: "student-2" }],
    },
  });
  const result = await updateMobileTeacherHomework(
    "teacher-user",
    "homework-1",
    {
      ...baseInput,
      expectedUpdatedAt: updatedAt.toISOString(),
      operationId: "22222222-2222-4222-8222-222222222222",
      studentProfileIds: ["student-2"],
    },
    { store },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "ASSIGNMENTS_LOCKED");
});

test("loads only an owned homework and refuses silent list truncation", async () => {
  let query: unknown;
  const store = profileStore({
    homework: {
      findFirst: async (args: unknown) => {
        query = args;
        return {
          _count: { interactiveFields: 0, submissions: 0 },
          assetFileName: null,
          dueDate: null,
          id: "homework-1",
          instructions: null,
          kind: "TEXT",
          lesson: { studentProfileId: "student-1" },
          lessonId: "lesson-1",
          questions: Array.from({ length: 51 }, (_, index) => ({
            expectedAnswer: null,
            id: `question-${index}`,
            prompt: `Question ${index}`,
          })),
          status: "DRAFT",
          studentAssignments: [{ studentProfileId: "student-1" }],
          title: "Homework",
          updatedAt,
        };
      },
    },
  });
  const result = await getMobileTeacherHomeworkEditor(
    "teacher-user",
    "homework-1",
    { store },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "LIMIT_EXCEEDED");
  assert.deepEqual(
    (query as { where: Record<string, unknown> }).where,
    { id: "homework-1", teacherProfileId: "teacher-1" },
  );
});

test("duplicates the complete homework for any active target student", async () => {
  const calls: Record<string, unknown> = {};
  const source = {
    assetFileName: "homework.pdf",
    assetMimeType: "application/pdf",
    assetPageCount: 1,
    assetSizeBytes: 1200,
    assetStoragePath: "homeworks/file.pdf",
    dueDate: null,
    fieldDetectionSource: "manual",
    id: "homework-source",
    instructions: "Complete it",
    interactiveFields: [],
    kind: "TEXT",
    lesson: {
      description: "Lesson",
      scheduledAt: null,
      status: "PUBLISHED",
      studentProfileId: "student-1",
      title: "Lesson 1",
    },
    questions: [{ expectedAnswer: null, prompt: "Introduce yourself", sortOrder: 0 }],
    status: "PUBLISHED",
    studentAssignments: [{ studentProfileId: "student-1" }],
    teacherProfileId: "teacher-1",
    title: "Introductions",
  };
  const store = profileStore({
    homework: {
      create: async (args: unknown) => {
        calls.create = args;
        return { id: "homework-copy" };
      },
      findFirst: async (args: { where?: { id?: string } }) =>
        args.where?.id ? source : null,
      findUnique: async () => null,
    },
    lesson: {
      create: async (args: unknown) => {
        calls.lessonCreate = args;
        return { id: "lesson-copy" };
      },
    },
    studentProfile: {
      findMany: async () => [{ id: "student-2" }],
    },
  });

  const result = await duplicateMobileTeacherHomework(
    "teacher-user",
    "homework-source",
    {
      operationId: "33333333-3333-4333-8333-333333333333",
      studentProfileIds: ["student-2"],
    },
    { store },
  );

  assert.equal(result.ok, true);
  assert.equal(result.data?.createdCount, 1);
  assert.deepEqual(result.data?.homeworkIds, ["homework-copy"]);
  assert.equal(
    (calls.create as { data: { replicatedFromHomeworkId: string } }).data
      .replicatedFromHomeworkId,
    "homework-source",
  );
});

test("deletes atomically, records the operation, and removes an unreferenced asset", async () => {
  const calls: Record<string, unknown> = {};
  const store = profileStore({
    homework: {
      count: async () => 0,
      delete: async (args: unknown) => {
        calls.delete = args;
        return { id: "homework-1" };
      },
      findFirst: async () => ({
        assetStoragePath: "homeworks/file.pdf",
        fieldDetectionSource: "manual",
        id: "homework-1",
        lesson: {
          _count: { homeworks: 2, materials: 0, vocabularyItems: 0 },
          id: "lesson-1",
          title: "Regular lesson",
        },
        updatedAt,
      }),
    },
    lesson: { delete: async () => assert.fail("must preserve regular lesson") },
    mobileTeacherHomeworkDeletion: {
      create: async (args: unknown) => {
        calls.deletionLog = args;
        return { operationId: "saved" };
      },
      findUnique: async () => null,
    },
  });
  let removed = "";
  const result = await deleteMobileTeacherHomework(
    "teacher-user",
    "homework-1",
    {
      expectedUpdatedAt: updatedAt.toISOString(),
      operationId: "44444444-4444-4444-8444-444444444444",
    },
    { removeAsset: async (path) => void (removed = path), store },
  );

  assert.equal(result.ok, true);
  assert.deepEqual(calls.delete, { where: { id: "homework-1" } });
  assert.equal(removed, "homeworks/file.pdf");
  assert.deepEqual(calls.deletionLog, {
    data: {
      homeworkId: "homework-1",
      operationId:
        "homework:delete:44444444-4444-4444-8444-444444444444",
      teacherProfileId: "teacher-1",
    },
  });
});

test("replays a durable deletion without touching the homework again", async () => {
  let transactionCalls = 0;
  const store = profileStore({
    $transaction: async () => {
      transactionCalls += 1;
    },
    mobileTeacherHomeworkDeletion: {
      findUnique: async () => ({
        homeworkId: "homework-1",
        teacherProfileId: "teacher-1",
      }),
    },
  });
  const result = await deleteMobileTeacherHomework(
    "teacher-user",
    "homework-1",
    {
      expectedUpdatedAt: updatedAt.toISOString(),
      operationId: "44444444-4444-4444-8444-444444444444",
    },
    { store },
  );

  assert.equal(result.ok, true);
  assert.equal(result.data?.replayed, true);
  assert.equal(transactionCalls, 0);
});

test("returns lesson and all active-student options without email data", async () => {
  const calls: Record<string, unknown> = {};
  const store = profileStore({
    lesson: {
      findMany: async (args: unknown) => {
        calls.lessons = args;
        return [
          {
            id: "lesson-1",
            status: "DRAFT",
            studentProfileId: "student-1",
            title: "Introductions",
          },
        ];
      },
    },
    studentProfile: {
      findMany: async (args: unknown) => {
        calls.students = args;
        return [
          {
            id: "student-1",
            level: "A1",
            user: { name: "Ana" },
          },
        ];
      },
    },
  });
  const result = await getMobileTeacherHomeworkOptions("teacher-user", { store });

  assert.equal(result.ok, true);
  assert.deepEqual(result.data?.students, [
    { id: "student-1", level: "A1", name: "Ana" },
  ]);
  assert.equal(JSON.stringify(calls.students).includes("email"), false);
});
