import assert from "node:assert/strict";
import test from "node:test";

import type { MobileAuthUser } from "@/lib/mobile-auth/contracts";
import {
  getMobileStudentNotifications,
  MobileNotificationError,
  type MobileNotificationStore,
} from "@/lib/mobile-notifications";

const now = new Date("2026-07-30T15:00:00.000Z");

function user(role: MobileAuthUser["role"]): MobileAuthUser {
  return {
    email: `${role.toLowerCase()}@candy.example`,
    id: `${role.toLowerCase()}-user`,
    name: `Candy ${role}`,
    role,
  };
}

function createStore(options?: {
  longLabels?: boolean;
  profileId?: string | null;
}) {
  const calls: Record<string, unknown> = {};
  const store = {
    candyXpEvent: {
      findMany: async (args: unknown) => {
        calls.candyXpEvent = args;
        return [
          {
            id: "xp-1",
            kind: "BADGE_AWARDED",
            occurredAt: new Date("2026-07-30T14:30:00.000Z"),
            sourceLabel: options?.longLabels
              ? "Badge ".repeat(100)
              : "Primeiro badge",
            xp: 25,
          },
        ];
      },
    },
    homework: {
      findMany: async (args: unknown) => {
        calls.homework = args;
        return [
          {
            id: "homework-pending",
            submissions: [],
            title: options?.longLabels
              ? "My routine ".repeat(100)
              : "My routine",
            updatedAt: new Date("2026-07-30T13:00:00.000Z"),
          },
          {
            id: "homework-complete",
            submissions: [{ status: "REVIEWED" }],
            title: "Already done",
            updatedAt: new Date("2026-07-30T12:00:00.000Z"),
          },
        ];
      },
    },
    homeworkSubmission: {
      findMany: async (args: unknown) => {
        calls.homeworkSubmission = args;
        return [
          {
            feedback: "Texto privado da teacher",
            homework: {
              id: "homework-reviewed",
              title: "Speaking practice",
            },
            id: "submission-1",
            reviewedAt: new Date("2026-07-30T14:00:00.000Z"),
            status: "REVIEWED",
          },
        ];
      },
    },
    lesson: {
      findMany: async (args: unknown) => {
        calls.lesson = args;
        return [
          {
            id: "lesson-1",
            title: options?.longLabels
              ? "Simple present ".repeat(100)
              : "Simple present",
            updatedAt: new Date("2026-07-30T12:30:00.000Z"),
          },
        ];
      },
    },
    studentProfile: {
      findUnique: async (args: unknown) => {
        calls.studentProfile = args;
        return options?.profileId === null
          ? null
          : { id: options?.profileId ?? "student-1" };
      },
    },
  } as unknown as MobileNotificationStore;

  return { calls, store };
}

test("rejects teacher and admin accounts before querying student data", async () => {
  for (const role of ["TEACHER", "ADMIN"] as const) {
    const { calls, store } = createStore();

    await assert.rejects(
      () => getMobileStudentNotifications(user(role), { now, store }),
      (error) =>
        error instanceof MobileNotificationError &&
        error.code === "NOTIFICATIONS_FORBIDDEN",
    );
    assert.deepEqual(calls, {});
  }
});

test("returns an empty inbox when the student profile is not linked", async () => {
  const { calls, store } = createStore({ profileId: null });
  const result = await getMobileStudentNotifications(user("STUDENT"), {
    now,
    store,
  });

  assert.deepEqual(result, {
    generatedAt: now.toISOString(),
    items: [],
  });
  assert.deepEqual(Object.keys(calls), ["studentProfile"]);
});

test("queries only the authenticated student's authorized records", async () => {
  const { calls, store } = createStore();

  await getMobileStudentNotifications(user("STUDENT"), { now, store });

  assert.deepEqual(
    (calls.lesson as { where: unknown }).where,
    {
      status: "PUBLISHED",
      studentProfileId: "student-1",
    },
  );
  assert.deepEqual(
    (calls.homework as { where: unknown }).where,
    {
      OR: [
        { lesson: { studentProfileId: "student-1" } },
        {
          studentAssignments: {
            some: { studentProfileId: "student-1" },
          },
        },
      ],
      status: "PUBLISHED",
    },
  );
  assert.deepEqual(
    (calls.homeworkSubmission as { where: unknown }).where,
    {
      reviewedAt: { not: null },
      status: { in: ["RETURNED", "REVIEWED"] },
      studentProfileId: "student-1",
    },
  );
  assert.deepEqual(
    (calls.candyXpEvent as { where: unknown }).where,
    {
      kind: {
        in: [
          "BADGE_AWARDED",
          "CANDY_XP_ACTIVITY_COMPLETED",
          "FEEDBACK_REVIEWED",
          "MISSION_COMPLETED",
          "PROFILE_READY",
          "STREAK_BONUS",
        ],
      },
      role: "STUDENT",
      userId: "student-user",
      xp: { gt: 0 },
    },
  );
});

test("builds a newest-first inbox without exposing private feedback", async () => {
  const { store } = createStore();
  const result = await getMobileStudentNotifications(user("STUDENT"), {
    now,
    store,
  });

  assert.deepEqual(
    result.items.map((item) => [item.id, item.type]),
    [
      ["achievement:xp-1", "ACHIEVEMENT"],
      ["feedback:submission-1", "FEEDBACK"],
      ["homework:homework-pending", "HOMEWORK"],
      ["lesson:lesson-1", "CLASS"],
    ],
  );
  assert.deepEqual(result.items[0]?.target, {
    id: null,
    kind: "CANDY_XP",
  });
  assert.deepEqual(result.items[1]?.target, {
    id: "homework-reviewed",
    kind: "HOMEWORK",
  });
  assert.equal(
    JSON.stringify(result).includes("Texto privado da teacher"),
    false,
  );
  assert.equal(
    result.items.some((item) => item.id === "homework:homework-complete"),
    false,
  );
  assert.equal(result.generatedAt, now.toISOString());
});

test("bounds long database labels before returning them to the app", async () => {
  const { store } = createStore({ longLabels: true });
  const result = await getMobileStudentNotifications(user("STUDENT"), {
    now,
    store,
  });

  assert.equal(result.items.every((item) => item.title.length <= 160), true);
  assert.equal(result.items.some((item) => item.title.endsWith("…")), true);
});
