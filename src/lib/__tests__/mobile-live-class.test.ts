import assert from "node:assert/strict";
import test from "node:test";

import type { MobileAuthUser } from "@/lib/mobile-auth/contracts";
import {
  getMobileLiveClassOverview,
  type MobileLiveClassStore,
  toMobileLiveClassSession,
} from "@/lib/mobile-live-class";

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
  studentProfileId?: string | null;
  teacherProfileId?: string | null;
}) {
  const calls: { findMany?: unknown; student?: unknown; teacher?: unknown } = {};
  const store = {
    liveSession: {
      findMany: async (args: unknown) => {
        calls.findMany = args;
        return [];
      },
    },
    studentProfile: {
      findUnique: async (args: unknown) => {
        calls.student = args;
        return options?.studentProfileId
          ? { id: options.studentProfileId }
          : null;
      },
    },
    teacherProfile: {
      findUnique: async (args: unknown) => {
        calls.teacher = args;
        return options?.teacherProfileId
          ? { id: options.teacherProfileId }
          : null;
      },
    },
  } as unknown as MobileLiveClassStore;

  return { calls, store };
}

test("returns the shared maintenance state without querying profiles", async () => {
  const { calls, store } = createStore({ studentProfileId: "student-1" });
  const overview = await getMobileLiveClassOverview(user("STUDENT"), {
    now,
    store,
  });

  assert.equal(overview.maintenance.enabled, true);
  assert.match(overview.maintenance.message ?? "", /manutencao/i);
  assert.deepEqual(overview.sessions, []);
  assert.deepEqual(calls, {});
});

test("limits a student to active global or own live sessions", async () => {
  const { calls, store } = createStore({ studentProfileId: "student-1" });

  await getMobileLiveClassOverview(user("STUDENT"), {
    maintenanceEnabled: false,
    now,
    store,
  });

  assert.deepEqual(
    (calls.findMany as { where: unknown }).where,
    {
      isLive: true,
      OR: [
        { studentProfileId: null },
        { studentProfileId: "student-1" },
      ],
    },
  );
});

test("limits a teacher to sessions owned by their profile", async () => {
  const { calls, store } = createStore({ teacherProfileId: "teacher-1" });

  await getMobileLiveClassOverview(user("TEACHER"), {
    maintenanceEnabled: false,
    now,
    store,
  });

  assert.deepEqual(
    (calls.findMany as { where: unknown }).where,
    { teacherProfileId: "teacher-1" },
  );
});

test("allows an admin to inspect the bounded operational session list", async () => {
  const { calls, store } = createStore();

  await getMobileLiveClassOverview(user("ADMIN"), {
    maintenanceEnabled: false,
    now,
    store,
  });

  assert.deepEqual(
    (calls.findMany as { take: unknown; where: unknown }),
    {
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        endsAt: true,
        id: true,
        isLive: true,
        meetUrl: true,
        startsAt: true,
        studentProfile: {
          select: { user: { select: { name: true } } },
        },
        teacherProfile: {
          select: { user: { select: { name: true } } },
        },
        title: true,
      },
      take: 50,
      where: {},
    },
  );
  assert.equal(calls.student, undefined);
  assert.equal(calls.teacher, undefined);
});

test("maps live sessions without exposing unsafe join links", () => {
  const common = {
    createdAt: now,
    endsAt: null,
    id: "live-1",
    isLive: true,
    startsAt: now,
    studentProfile: null,
    teacherProfile: { user: { name: "Teacher Candy" } },
    title: "Conversation",
  };

  assert.equal(
    toMobileLiveClassSession({
      ...common,
      meetUrl: "javascript:alert(1)",
    }).joinUrl,
    null,
  );
  assert.equal(
    toMobileLiveClassSession({
      ...common,
      meetUrl: "https://evil.example/candy-room",
    }).joinUrl,
    null,
  );
  assert.equal(
    toMobileLiveClassSession({
      ...common,
      meetUrl: "https://meet.jit.si/candy-room",
    }).joinUrl,
    "https://meet.jit.si/candy-room",
  );
});
