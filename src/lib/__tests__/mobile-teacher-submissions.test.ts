import assert from "node:assert/strict";
import test from "node:test";

import {
  getMobileTeacherSubmissionDetail,
  getMobileTeacherSubmissionQueue,
  redoMobileTeacherSubmission,
  reviewMobileTeacherSubmission,
  type MobileTeacherSubmissionStore,
} from "../mobile-teacher-submissions";

const submittedAt = new Date("2026-08-01T15:00:00.000Z");
const operationId = "11111111-1111-4111-8111-111111111111";

function asStore(value: unknown) {
  return value as MobileTeacherSubmissionStore;
}

function profileStore(extra: Record<string, unknown>) {
  const store: Record<string, unknown> = {
    teacherProfile: { findUnique: async () => ({ id: "teacher-1" }) },
    ...extra,
  };
  if (!("$transaction" in store)) {
    store.$transaction = async (callback: (tx: unknown) => unknown) =>
      callback(store);
  }
  return asStore(store);
}

function detailRow(overrides: Record<string, unknown> = {}) {
  return {
    answers: [{ answer: "I am fine." }],
    feedback: null,
    homework: {
      id: "homework-1",
      instructions: "Answer in English.",
      interactiveFields: [],
      kind: "TEXT",
      lesson: { title: "Conversation" },
      questions: [
        { expectedAnswer: "I am fine.", id: "question-1", prompt: "How are you?" },
      ],
      teacherProfileId: "teacher-1",
      title: "Daily conversation",
    },
    id: "submission-1",
    reviewedAt: null,
    status: "SUBMITTED",
    studentProfile: {
      id: "student-1",
      level: "A1",
      user: { name: "Ana" },
    },
    submittedAt,
    teacherAnnotations: null,
    ...overrides,
  };
}

test("rejects invalid feedback before querying the teacher profile", async () => {
  let profileCalls = 0;
  const store = asStore({
    teacherProfile: {
      findUnique: async () => {
        profileCalls += 1;
        return { id: "teacher-1" };
      },
    },
  });

  const result = await reviewMobileTeacherSubmission(
    "teacher-user",
    "submission-1",
    {
      expectedReviewedAt: null,
      expectedStatus: "SUBMITTED",
      expectedSubmittedAt: submittedAt.toISOString(),
      feedback: "x",
      operationId,
    },
    { store },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "INVALID");
  assert.equal(profileCalls, 0);
});

test("lists only the teacher non-draft submissions without student email", async () => {
  let query: unknown;
  const store = profileStore({
    homeworkSubmission: {
      findMany: async (args: unknown) => {
        query = args;
        return [detailRow()];
      },
    },
  });

  const result = await getMobileTeacherSubmissionQueue("teacher-user", { store });

  assert.equal(result.ok, true);
  assert.equal(result.data?.hasMore, false);
  assert.deepEqual(result.data?.submissions[0], {
    feedbackPresent: false,
    homeworkId: "homework-1",
    homeworkKind: "TEXT",
    homeworkTitle: "Daily conversation",
    id: "submission-1",
    lessonTitle: "Conversation",
    reviewedAt: null,
    status: "SUBMITTED",
    studentLevel: "A1",
    studentName: "Ana",
    submittedAt: submittedAt.toISOString(),
  });
  assert.deepEqual((query as { where: unknown }).where, {
    homework: { teacherProfileId: "teacher-1" },
    status: { not: "DRAFT" },
  });
  assert.equal(JSON.stringify(query).includes("email"), false);
});

test("loads a teacher-owned text submission with the normalized answer", async () => {
  let query: unknown;
  const store = profileStore({
    homeworkSubmission: {
      findFirst: async (args: unknown) => {
        query = args;
        return detailRow();
      },
    },
  });

  const result = await getMobileTeacherSubmissionDetail(
    "teacher-user",
    "submission-1",
    { store },
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.data?.answers, [
    {
      id: "text-answer",
      label: "How are you?",
      type: "TEXT",
      value: "I am fine.",
    },
  ]);
  assert.deepEqual((query as { where: unknown }).where, {
    homework: { teacherProfileId: "teacher-1" },
    id: "submission-1",
    status: { not: "DRAFT" },
  });
});

test("refuses oversized interactive submissions instead of truncating them", async () => {
  const fields = Array.from({ length: 121 }, (_, index) => ({
    id: `field-${index}`,
    label: `Field ${index}`,
    placeholder: null,
    sortOrder: index,
    type: "SHORT_TEXT",
  }));
  const store = profileStore({
    homeworkSubmission: {
      findFirst: async () =>
        detailRow({
          answers: [],
          homework: {
            ...detailRow().homework,
            interactiveFields: fields,
            kind: "INTERACTIVE",
            questions: [],
          },
        }),
    },
  });

  const result = await getMobileTeacherSubmissionDetail(
    "teacher-user",
    "submission-1",
    { store },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "LIMIT_EXCEEDED");
});

test("refuses an oversized interactive answer instead of hiding it", async () => {
  const store = profileStore({
    homeworkSubmission: {
      findFirst: async () =>
        detailRow({
          answers: [{ fieldId: "field-1", value: "x".repeat(50_001) }],
          homework: {
            ...detailRow().homework,
            interactiveFields: [
              {
                id: "field-1",
                label: "Answer",
                placeholder: null,
                sortOrder: 0,
                type: "LONG_TEXT",
              },
            ],
            kind: "INTERACTIVE",
            questions: [],
          },
        }),
    },
  });

  const result = await getMobileTeacherSubmissionDetail(
    "teacher-user",
    "submission-1",
    { store },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "LIMIT_EXCEEDED");
});

test("reviews the expected submission version under the shared advisory lock", async () => {
  let update: unknown;
  let lockKey = "";
  const store = profileStore({
    homeworkSubmission: {
      findFirst: async () => ({
        feedback: null,
        homeworkId: "homework-1",
        id: "submission-1",
        lastMobileReviewOperationId: null,
        reviewedAt: null,
        status: "SUBMITTED",
        studentProfileId: "student-1",
        submittedAt,
      }),
      findUnique: async () => ({
        feedback: null,
        id: "submission-1",
        lastMobileReviewOperationId: null,
        reviewedAt: null,
        status: "SUBMITTED",
        submittedAt,
      }),
      update: async (args: unknown) => {
        update = args;
        return {
          feedback: "Great work!",
          id: "submission-1",
          reviewedAt: new Date("2026-08-01T16:00:00.000Z"),
          status: "REVIEWED",
          submittedAt,
        };
      },
    },
  });

  const result = await reviewMobileTeacherSubmission(
    "teacher-user",
    "submission-1",
    {
      expectedReviewedAt: null,
      expectedStatus: "SUBMITTED",
      expectedSubmittedAt: submittedAt.toISOString(),
      feedback: "Great work!",
      operationId,
    },
    {
      acquireLock: async (_tx, key) => {
        lockKey = key;
      },
      store,
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.data?.status, "REVIEWED");
  assert.equal(lockKey, "homework-submission:homework-1:student-1");
  assert.deepEqual((update as { data: unknown }).data, {
    feedback: "Great work!",
    lastMobileRedoOperationId: null,
    lastMobileReviewOperationId: `submission:review:${operationId}`,
    reviewedAt: (update as { data: { reviewedAt: Date } }).data.reviewedAt,
    reviewedByTeacherProfileId: "teacher-1",
    status: "REVIEWED",
  });
});

test("detects a concurrent resubmission before saving feedback", async () => {
  let updateCalls = 0;
  const store = profileStore({
    homeworkSubmission: {
      findFirst: async () => ({
        homeworkId: "homework-1",
        id: "submission-1",
        studentProfileId: "student-1",
      }),
      findUnique: async () => ({
        feedback: null,
        id: "submission-1",
        lastMobileReviewOperationId: null,
        reviewedAt: null,
        status: "SUBMITTED",
        submittedAt: new Date("2026-08-01T15:01:00.000Z"),
      }),
      update: async () => {
        updateCalls += 1;
      },
    },
  });

  const result = await reviewMobileTeacherSubmission(
    "teacher-user",
    "submission-1",
    {
      expectedReviewedAt: null,
      expectedStatus: "SUBMITTED",
      expectedSubmittedAt: submittedAt.toISOString(),
      feedback: "Great work!",
      operationId,
    },
    { acquireLock: async () => undefined, store },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "CONFLICT");
  assert.equal(updateCalls, 0);
});

test("detects feedback changed by another teacher session", async () => {
  let updateCalls = 0;
  const store = profileStore({
    homeworkSubmission: {
      findFirst: async () => ({
        homeworkId: "homework-1",
        id: "submission-1",
        studentProfileId: "student-1",
      }),
      findUnique: async () => ({
        feedback: "Newer feedback",
        id: "submission-1",
        lastMobileReviewOperationId: null,
        reviewedAt: new Date("2026-08-01T16:01:00.000Z"),
        status: "REVIEWED",
        submittedAt,
      }),
      update: async () => {
        updateCalls += 1;
      },
    },
  });

  const result = await reviewMobileTeacherSubmission(
    "teacher-user",
    "submission-1",
    {
      expectedReviewedAt: "2026-08-01T16:00:00.000Z",
      expectedStatus: "REVIEWED",
      expectedSubmittedAt: submittedAt.toISOString(),
      feedback: "My stale feedback",
      operationId,
    },
    { acquireLock: async () => undefined, store },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "CONFLICT");
  assert.equal(updateCalls, 0);
});

test("replays an already completed feedback operation without a second update", async () => {
  let updateCalls = 0;
  const store = profileStore({
    homeworkSubmission: {
      findFirst: async () => ({
        homeworkId: "homework-1",
        id: "submission-1",
        studentProfileId: "student-1",
      }),
      findUnique: async () => ({
        feedback: "Great work!",
        id: "submission-1",
        lastMobileReviewOperationId: `submission:review:${operationId}`,
        reviewedAt: new Date("2026-08-01T16:00:00.000Z"),
        status: "REVIEWED",
        submittedAt,
      }),
      update: async () => {
        updateCalls += 1;
      },
    },
  });

  const result = await reviewMobileTeacherSubmission(
    "teacher-user",
    "submission-1",
    {
      expectedReviewedAt: null,
      expectedStatus: "SUBMITTED",
      expectedSubmittedAt: submittedAt.toISOString(),
      feedback: "Great work!",
      operationId,
    },
    { acquireLock: async () => undefined, store },
  );

  assert.equal(result.ok, true);
  assert.equal(result.data?.replayed, true);
  assert.equal(updateCalls, 0);
});

test("returns a reviewed submission for a redo and preserves optional feedback", async () => {
  let update: unknown;
  const store = profileStore({
    homeworkSubmission: {
      findFirst: async () => ({
        homeworkId: "homework-1",
        id: "submission-1",
        studentProfileId: "student-1",
      }),
      findUnique: async () => ({
        feedback: "Try the second sentence again.",
        id: "submission-1",
        lastMobileRedoOperationId: null,
        reviewedAt: new Date("2026-08-01T16:00:00.000Z"),
        status: "REVIEWED",
        submittedAt,
      }),
      update: async (args: unknown) => {
        update = args;
        return {
          feedback: "Try the second sentence again.",
          id: "submission-1",
          reviewedAt: null,
          status: "RETURNED",
          submittedAt,
        };
      },
    },
  });

  const result = await redoMobileTeacherSubmission(
    "teacher-user",
    "submission-1",
    {
      expectedReviewedAt: "2026-08-01T16:00:00.000Z",
      expectedStatus: "REVIEWED",
      expectedSubmittedAt: submittedAt.toISOString(),
      feedback: null,
      operationId,
    },
    { acquireLock: async () => undefined, store },
  );

  assert.equal(result.ok, true);
  assert.equal(result.data?.status, "RETURNED");
  assert.deepEqual((update as { data: unknown }).data, {
    feedback: "Try the second sentence again.",
    lastMobileRedoOperationId: `submission:redo:${operationId}`,
    lastMobileReviewOperationId: null,
    reviewedAt: null,
    reviewedByTeacherProfileId: null,
    status: "RETURNED",
  });
});
