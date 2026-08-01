import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTeacherCandyXpEvents,
  getMobileTeacherCandyXpOverview,
  type MobileTeacherCandyXpStore,
} from "@/lib/mobile-teacher-candy-xp";

function asStore(value: unknown) {
  return value as MobileTeacherCandyXpStore;
}

test("builds stable teacher XP events from permitted pedagogical work", () => {
  const events = buildTeacherCandyXpEvents({
    homeworkIds: ["homework-1"],
    lessonIds: ["lesson-1"],
    liveSessionIds: ["live-1"],
    profileReady: true,
    reviewedSubmissionIds: ["submission-1"],
    studentProfileIds: ["student-1"],
    teacherProfileId: "teacher-1",
  });

  assert.deepEqual(
    events.map((event) => event.sourceKey),
    [
      "teacher:profile-ready:teacher-1",
      "teacher:student-linked:teacher-1:student-1",
      "teacher:lesson-created:lesson-1",
      "teacher:homework-created:homework-1",
      "teacher:feedback-reviewed:submission-1",
      "teacher:live-session:live-1",
    ],
  );
  assert.ok(events.every((event) => event.xp > 0));
});

test("returns no teacher XP data when the authenticated profile is unavailable", async () => {
  let scopedQueries = 0;
  const result = await getMobileTeacherCandyXpOverview("teacher-user", {
    store: asStore({
      homework: { findMany: async () => (scopedQueries += 1, []) },
      homeworkSubmission: { findMany: async () => (scopedQueries += 1, []) },
      lesson: { findMany: async () => (scopedQueries += 1, []) },
      liveSession: { findMany: async () => (scopedQueries += 1, []) },
      studentTeacherAssignment: {
        findMany: async () => (scopedQueries += 1, []),
      },
      teacherProfile: { findFirst: async () => null },
    }),
  });

  assert.equal(result, null);
  assert.equal(scopedQueries, 0);
});

test("refuses to truncate an oversized teacher XP source", async () => {
  let recordCalls = 0;
  await assert.rejects(
    getMobileTeacherCandyXpOverview("teacher-user", {
      recordEvents: async () => {
        recordCalls += 1;
        throw new Error("must not record a partial history");
      },
      store: asStore({
        homework: { findMany: async () => [] },
        homeworkSubmission: { findMany: async () => [] },
        lesson: { findMany: async () => [] },
        liveSession: { findMany: async () => [] },
        studentTeacherAssignment: {
          findMany: async () =>
            Array.from({ length: 1_001 }, (_, index) => ({
              studentProfileId: `student-${index}`,
            })),
        },
        teacherProfile: {
          findFirst: async () => ({
            id: "teacher-1",
            user: { avatarPath: null, phone: null },
          }),
        },
      }),
    }),
    /TEACHER_XP_LIMIT_EXCEEDED/,
  );
  assert.equal(recordCalls, 0);
});

test("syncs only the authenticated teacher scope and returns a private summary", async () => {
  const scopes: unknown[] = [];
  let recorded: unknown;
  const result = await getMobileTeacherCandyXpOverview("teacher-user", {
    getRanking: async (input) => {
      assert.deepEqual(input, {
        currentUserId: "teacher-user",
        limit: 10,
        rankingRole: "TEACHER",
      });
      return ({
        currentUserEntry: null,
        currentUserRanking: {
          categoryLabel: "teachers",
          categoryTitle: "Ranking Candy Teacher",
          hasXp: true,
          position: 1,
          totalInCategory: 2,
          totalXp: 180,
          xpToNextLevel: 20,
        },
        generatedAt: "2026-08-01T21:00:00.000Z",
        topEntries: [
          {
            avatarPath: "private/avatars/teacher.jpg",
            isCurrentUser: true,
            lastXpEventAt: "2026-08-01T20:00:00.000Z",
            level: 2,
            name: "Candy Teacher",
            position: 1,
            progressPercent: 80,
            progressXp: 80,
            requiredXp: 100,
            role: "TEACHER",
            roleLabel: "Teacher",
            totalXp: 180,
            userId: "private-teacher-user",
            xpToNextLevel: 20,
          },
        ],
        totalRanked: 2,
      }) as never;
    },
    recordEvents: async (input) => {
      recorded = input;
      return {
        badgeCount: 1,
        longestStreakDays: 2,
        recentEvents: [
          {
            occurredAt: "2026-08-01T20:00:00.000Z",
            sourceLabel: "Feedbacks dados",
            xp: 35,
          },
        ],
        sourceStats: {
          "Aulas criadas": { value: 1, xp: 30 },
          "Feedbacks dados": { value: 1, xp: 35 },
        },
        streakDays: 2,
        totalXp: 180,
      };
    },
    store: asStore({
      homework: {
        findMany: async (args: unknown) => {
          scopes.push(args);
          return [{ id: "homework-1" }];
        },
      },
      homeworkSubmission: {
        findMany: async (args: unknown) => {
          scopes.push(args);
          return [
            { id: "submission-1", status: "REVIEWED" },
            { id: "submission-2", status: "SUBMITTED" },
          ];
        },
      },
      lesson: {
        findMany: async (args: unknown) => {
          scopes.push(args);
          return [{ id: "lesson-1" }];
        },
      },
      liveSession: {
        findMany: async (args: unknown) => {
          scopes.push(args);
          return [{ id: "live-1" }];
        },
      },
      studentTeacherAssignment: {
        findMany: async (args: unknown) => {
          scopes.push(args);
          return [{ studentProfileId: "student-1" }];
        },
      },
      teacherProfile: {
        findFirst: async () => ({
          id: "teacher-1",
          user: { avatarPath: "private/avatar.jpg", phone: null },
        }),
      },
    }),
  });

  assert.ok(scopes.every((scope) => JSON.stringify(scope).includes("teacher-1")));
  assert.equal((recorded as { role: string }).role, "TEACHER");
  assert.deepEqual(result?.profile, {
    badgeCount: 1,
    level: 2,
    longestStreakDays: 2,
    progressPercent: 34,
    progressXp: 60,
    requiredXp: 175,
    streakDays: 2,
    totalXp: 180,
    xpToNextLevel: 115,
  });
  assert.equal(result?.ranking.topEntries[0]?.name, "Candy Teacher");
  assert.equal(result?.spotlightCard.status, "1 pendente(s)");
  assert.doesNotMatch(
    JSON.stringify(result),
    /avatarPath|private\/avatar|private-teacher-user|userId|correctAnswer|storage/i,
  );
});
