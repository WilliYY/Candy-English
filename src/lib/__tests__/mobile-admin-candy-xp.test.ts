import assert from "node:assert/strict";
import test from "node:test";

import {
  getMobileAdminCandyXp,
  getMobileAdminCandyXpActivity,
  MobileAdminCandyXpError,
  reviewMobileAdminCandyXpSubmission,
  updateMobileAdminCandyXpActivity,
} from "@/lib/mobile-admin-candy-xp";

const admin = {
  email: "admin@candy.example",
  id: "admin-1",
  name: "Admin Candy",
  role: "ADMIN" as const,
};
const updatedAt = "2026-08-02T12:00:00.000Z";
const operationId = "77777777-7777-4777-8777-777777777777";

function activity(overrides: Record<string, unknown> = {}) {
  return {
    _count: { submissions: 2 },
    assetFileName: "story.pdf",
    assetMimeType: "application/pdf",
    assetPageCount: 2,
    assetSizeBytes: 4096,
    assignments: [
      {
        studentProfile: {
          id: "student-1",
          user: { name: "Ana Candy" },
        },
      },
    ],
    category: "Story",
    createdAt: new Date("2026-08-01T12:00:00.000Z"),
    description: "Read and answer",
    id: "activity-1",
    level: "A1",
    publishedAt: new Date("2026-08-01T13:00:00.000Z"),
    status: "PUBLISHED" as const,
    title: "Sweet story",
    updatedAt: new Date(updatedAt),
    xpReward: 80,
    ...overrides,
  };
}

function detail(overrides: Record<string, unknown> = {}) {
  return {
    ...activity(),
    interactiveFields: [],
    questions: [
      {
        correctAnswer: { values: ["pink"] },
        id: "question-1",
        options: ["pink", "blue"],
        prompt: "What color?",
        required: true,
        sortOrder: 0,
        type: "SHORT_TEXT" as const,
      },
    ],
    submissions: [
      {
        answers: [{ questionId: "question-1", value: "pink" }],
        autoScorePercent: null,
        awardedXp: null,
        feedback: null,
        id: "submission-1",
        reviewedAt: null,
        reviewedByUser: null,
        status: "SUBMITTED" as const,
        studentProfile: { user: { name: "Ana Candy" } },
        submittedAt: new Date("2026-08-02T11:00:00.000Z"),
        updatedAt: new Date(updatedAt),
      },
    ],
    ...overrides,
  };
}

test("rejects non-admin Candy XP reads before querying private data", async () => {
  let touched = false;
  await assert.rejects(
    () =>
      getMobileAdminCandyXp(
        { ...admin, role: "TEACHER" },
        {},
        {
          getRanking: async () => (touched = true, {} as never),
          store: {
            candyXpActivity: {
              findMany: async () => (touched = true, []),
            },
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminCandyXpError &&
      error.code === "ROLE_FORBIDDEN",
  );
  assert.equal(touched, false);
});

test("lists safe activities, indicators and ranking without private identifiers", async () => {
  const result = await getMobileAdminCandyXp(
    admin,
    { limit: 20, query: "Sweet", status: "ALL" },
    {
      getRanking: async () => ({
        currentUserEntry: null,
        currentUserRanking: null,
        generatedAt: "2026-08-02T12:10:00.000Z",
        topEntries: [
          {
            avatarPath: "avatars/private.webp",
            isCurrentUser: false,
            lastXpEventAt: null,
            level: 4,
            name: "Ana Candy",
            position: 1,
            progressPercent: 50,
            progressXp: 50,
            requiredXp: 100,
            role: "STUDENT",
            roleLabel: "Aluno",
            totalXp: 450,
            userId: "private-user-id",
            xpToNextLevel: 50,
          },
        ],
        totalRanked: 1,
      }),
      now: () => new Date("2026-08-02T12:15:00.000Z"),
      store: {
        candyXpActivity: {
          count: async (query?: { where?: { status?: string } }) =>
            query?.where?.status === "DRAFT"
              ? 1
              : query?.where?.status === "PUBLISHED"
                ? 2
                : query?.where?.status === "ARCHIVED"
                  ? 3
                  : 6,
          findMany: async () => [activity()],
        },
        candyXpActivitySubmission: {
          count: async () => 4,
        },
      } as never,
    },
  );

  assert.equal(result.activities[0]?.title, "Sweet story");
  assert.deepEqual(result.summary, {
    archived: 3,
    draft: 1,
    pendingReviews: 4,
    published: 2,
    total: 6,
  });
  assert.equal(result.ranking.topEntries[0]?.role, "STUDENT");
  assert.equal("userId" in result.ranking.topEntries[0]!, false);
  assert.equal("avatarPath" in result.ranking.topEntries[0]!, false);
  assert.equal("assetStoragePath" in result.activities[0]!, false);
  assert.equal("studentEmail" in result.activities[0]!.release.students[0]!, false);
});

test("returns review detail with bounded answers but no student email", async () => {
  const result = await getMobileAdminCandyXpActivity(admin, "activity-1", {
    store: {
      candyXpActivity: { findUnique: async () => detail() },
      studentProfile: {
        findMany: async () => [
          { id: "student-1", user: { name: "Ana Candy" } },
        ],
      },
    } as never,
  });

  assert.equal(result.activity.questions[0]?.correctAnswer !== null, true);
  assert.deepEqual(result.activity.submissions[0]?.answers, [
    { questionId: "question-1", value: "pink" },
  ]);
  assert.equal("studentEmail" in result.activity.submissions[0]!, false);
  assert.deepEqual(result.students, [{ id: "student-1", name: "Ana Candy" }]);
});

test("rejects a stale activity update before replacing its release", async () => {
  let deleted = false;
  await assert.rejects(
    () =>
      updateMobileAdminCandyXpActivity(
        admin,
        "activity-1",
        {
          category: "Story",
          confirmChange: true,
          description: "Read",
          expectedUpdatedAt: "2026-08-02T11:00:00.000Z",
          level: "A1",
          operationId,
          releaseMode: "ALL",
          status: "PUBLISHED",
          studentProfileId: null,
          title: "Sweet story",
          xpReward: 80,
        },
        {
          acquireLock: async () => undefined,
          store: {
            $transaction: async (callback: (tx: unknown) => unknown) =>
              callback({
                candyXpActivity: { findUnique: async () => activity() },
                candyXpActivityAssignment: {
                  deleteMany: async () => (deleted = true),
                },
                mobileAdminCandyXpOperation: { findUnique: async () => null },
              }),
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminCandyXpError &&
      error.code === "EDIT_CONFLICT",
  );
  assert.equal(deleted, false);
});

test("updates activity metadata and a single active-student release atomically", async () => {
  let activityData: Record<string, unknown> | undefined;
  let assignmentData: Record<string, unknown> | undefined;
  let operationData: Record<string, unknown> | undefined;
  let reads = 0;
  const result = await updateMobileAdminCandyXpActivity(
    admin,
    "activity-1",
    {
      category: "Reading",
      confirmChange: true,
      description: "Read carefully",
      expectedUpdatedAt: updatedAt,
      level: "A1",
      operationId,
      releaseMode: "STUDENT",
      status: "PUBLISHED",
      studentProfileId: "student-1",
      title: "Sweet story updated",
      xpReward: 90,
    },
    {
      acquireLock: async () => undefined,
      store: {
        $transaction: async (callback: (tx: unknown) => unknown) =>
          callback({
            candyXpActivity: {
              findUnique: async () =>
                ++reads === 1
                  ? activity()
                  : activity({
                      category: "Reading",
                      title: "Sweet story updated",
                      updatedAt: new Date("2026-08-02T12:01:00.000Z"),
                      xpReward: 90,
                    }),
              updateMany: async (query: { data: Record<string, unknown> }) => {
                activityData = query.data;
                return { count: 1 };
              },
            },
            candyXpActivityAssignment: {
              create: async (query: { data: Record<string, unknown> }) =>
                (assignmentData = query.data),
              deleteMany: async () => ({ count: 1 }),
            },
            mobileAdminCandyXpOperation: {
              create: async (query: { data: Record<string, unknown> }) =>
                (operationData = query.data),
              findUnique: async () => null,
            },
            studentProfile: {
              findFirst: async () => ({ id: "student-1" }),
            },
          }),
      } as never,
    },
  );

  assert.equal(result.replayed, false);
  assert.equal(result.activity.title, "Sweet story updated");
  assert.equal(activityData?.xpReward, 90);
  assert.deepEqual(assignmentData, {
    activityId: "activity-1",
    studentProfileId: "student-1",
  });
  assert.equal(operationData?.kind, "UPDATE_ACTIVITY");
  assert.equal(typeof operationData?.payloadDigest, "string");
});

test("approves one current submission and refreshes its XP exactly once", async () => {
  let awarded = false;
  let refreshed = false;
  let operationData: Record<string, unknown> | undefined;
  let reads = 0;
  const result = await reviewMobileAdminCandyXpSubmission(
    admin,
    "submission-1",
    {
      confirmReview: true,
      expectedUpdatedAt: updatedAt,
      feedback: "Great work!",
      operationId,
      outcome: "APPROVE",
    },
    {
      acquireLock: async () => undefined,
      awardSubmission: async () => {
        awarded = true;
        return {
          event: {
            kind: "CANDY_XP_ACTIVITY_COMPLETED" as const,
            sourceKey: "student:candy-xp-activity:submission-1",
            sourceLabel: "Candy XP",
            xp: 80,
          },
          studentUserId: "student-user-1",
        };
      },
      refreshAward: async () => {
        refreshed = true;
      },
      store: {
        $transaction: async (callback: (tx: unknown) => unknown) =>
          callback({
            candyXpActivitySubmission: {
              findUnique: async () =>
                ++reads === 1
                  ? {
                      ...detail().submissions[0],
                      activity: { id: "activity-1", title: "Sweet story", xpReward: 80 },
                      studentProfile: {
                        user: { id: "student-user-1", name: "Ana Candy" },
                      },
                    }
                  : {
                      ...detail().submissions[0],
                      awardedXp: 80,
                      feedback: "Great work!",
                      reviewedAt: new Date("2026-08-02T12:01:00.000Z"),
                      reviewedByUser: { name: "Admin Candy" },
                      status: "REVIEWED" as const,
                      studentProfile: { user: { name: "Ana Candy" } },
                      updatedAt: new Date("2026-08-02T12:01:00.000Z"),
                    },
              updateMany: async () => ({ count: 1 }),
            },
            mobileAdminCandyXpOperation: {
              create: async (query: { data: Record<string, unknown> }) =>
                (operationData = query.data),
              findUnique: async () => null,
            },
          }),
      } as never,
    },
  );

  assert.equal(result.submission.status, "REVIEWED");
  assert.equal(result.submission.awardedXp, 80);
  assert.equal(result.replayed, false);
  assert.equal(awarded, true);
  assert.equal(refreshed, true);
  assert.equal(operationData?.kind, "REVIEW_SUBMISSION");
});

test("rejects reuse of a Candy XP operation with different intent", async () => {
  await assert.rejects(
    () =>
      reviewMobileAdminCandyXpSubmission(
        admin,
        "submission-1",
        {
          confirmReview: true,
          expectedUpdatedAt: updatedAt,
          feedback: "Changed",
          operationId,
          outcome: "RETURN",
        },
        {
          acquireLock: async () => undefined,
          store: {
            $transaction: async (callback: (tx: unknown) => unknown) =>
              callback({
                mobileAdminCandyXpOperation: {
                  findUnique: async () => ({
                    actorUserId: admin.id,
                    kind: "REVIEW_SUBMISSION",
                    operationId,
                    payloadDigest: "different",
                    targetId: "submission-1",
                  }),
                },
              }),
          } as never,
        },
      ),
    (error: unknown) =>
      error instanceof MobileAdminCandyXpError &&
      error.code === "OPERATION_CONFLICT",
  );
});
