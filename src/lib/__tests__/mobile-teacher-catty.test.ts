import assert from "node:assert/strict";
import test from "node:test";

import {
  changeMobileTeacherCattyArtifactStatus,
  createMobileTeacherCattyLearning,
  getMobileTeacherCattyManagement,
  saveMobileTeacherCattyArtifact,
  type MobileTeacherCattyStore,
} from "@/lib/mobile-teacher-catty";

function asStore(value: unknown) {
  return value as MobileTeacherCattyStore;
}

test("returns no Catty management data without an active teacher profile", async () => {
  let scopedQueries = 0;
  const result = await getMobileTeacherCattyManagement("teacher-user", {
    store: asStore({
      cattyLearningItem: {
        count: async () => (scopedQueries += 1, 0),
        findMany: async () => (scopedQueries += 1, []),
      },
      cattyUserArtifact: {
        findMany: async () => (scopedQueries += 1, []),
      },
      studentTeacherAssignment: {
        findMany: async () => (scopedQueries += 1, []),
      },
      teacherProfile: { findFirst: async () => null },
    }),
  });

  assert.equal(result, null);
  assert.equal(scopedQueries, 0);
});

test("returns only linked active students, their artifacts, and the teacher own learning", async () => {
  const calls: Array<{ name: string; value: unknown }> = [];
  const now = new Date("2026-08-01T12:00:00.000Z");
  const management = await getMobileTeacherCattyManagement("teacher-user", {
    store: asStore({
      cattyLearningItem: {
        count: async (value: unknown) => {
          calls.push({ name: "count", value });
          return 7;
        },
        findMany: async (value: unknown) => {
          calls.push({ name: "learning", value });
          return [
            {
              badReply: null,
              category: "VOCABULARY",
              createdAt: now,
              id: "learning-1",
              idealReply: "Use one short example.",
              intent: "meaning_lookup",
              notes: "Explain with care.",
              status: "PENDING",
              tags: ["vocabulary"],
              title: "Word meaning",
              updatedAt: now,
              userPrompt: "What does brave mean?",
            },
          ];
        },
        create: async () => {
          throw new Error("not used");
        },
      },
      cattyUserArtifact: {
        findMany: async (value: unknown) => {
          calls.push({ name: "artifacts", value });
          return [
            {
              catchphrases: ["Level up!"],
              emojis: ["🎮"],
              example: "Gaming vocabulary",
              id: "artifact-1",
              isPrimary: true,
              label: "Games",
              sounds: ["pop"],
              status: "ACTIVE",
              themeId: "games",
              toneRule: "Keep it light.",
              updatedAt: now,
              userId: "student-active",
            },
          ];
        },
      },
      studentTeacherAssignment: {
        findMany: async (value: unknown) => {
          calls.push({ name: "students", value });
          return [
            {
              studentProfile: {
                user: { id: "student-active", isActive: true, name: "Ana" },
              },
            },
            {
              studentProfile: {
                user: { id: "student-disabled", isActive: false, name: "Bia" },
              },
            },
          ];
        },
      },
      teacherProfile: {
        findFirst: async (value: unknown) => {
          calls.push({ name: "profile", value });
          return { id: "teacher-profile" };
        },
      },
    }),
  });

  assert.ok(management);
  assert.deepEqual(management.students, [{ id: "student-active", name: "Ana" }]);
  assert.equal(management.approvedLearningCount, 7);
  assert.equal(management.artifacts[0]?.studentId, "student-active");
  assert.equal(management.learningItems[0]?.title, "Word meaning");
  assert.ok(management.themeOptions.length > 0);

  const artifactQuery = calls.find((call) => call.name === "artifacts")?.value;
  const learningQuery = calls.find((call) => call.name === "learning")?.value;
  assert.deepEqual(
    (artifactQuery as { where: { userId: { in: string[] } } }).where.userId.in,
    ["student-active"],
  );
  assert.equal(
    (learningQuery as { where: { createdByUserId: string } }).where
      .createdByUserId,
    "teacher-user",
  );
  assert.equal(
    (
      learningQuery as {
        where: { category: { in: string[] } };
      }
    ).where.category.in.includes("PERSONALITY_RULE"),
    false,
  );
  assert.equal(JSON.stringify(management).includes("email"), false);
  assert.equal(JSON.stringify(management).includes("createdByUserId"), false);
});

test("refuses to silently truncate a teacher linked-student scope", async () => {
  let dataQueries = 0;
  await assert.rejects(
    getMobileTeacherCattyManagement("teacher-user", {
      store: asStore({
        cattyLearningItem: {
          count: async () => (dataQueries += 1, 0),
          findMany: async () => (dataQueries += 1, []),
        },
        cattyUserArtifact: {
          findMany: async () => (dataQueries += 1, []),
        },
        studentTeacherAssignment: {
          findMany: async () =>
            Array.from({ length: 101 }, (_, index) => ({
              studentProfile: {
                user: {
                  id: "student-" + index,
                  isActive: true,
                  name: "Student " + index,
                },
              },
            })),
        },
        teacherProfile: { findFirst: async () => ({ id: "teacher-profile" }) },
      }),
    }),
    /TEACHER_CATTY_STUDENT_LIMIT_EXCEEDED/,
  );
  assert.equal(dataQueries, 0);
});

test("creates only permitted teacher learning as pending", async () => {
  let profileQueries = 0;
  let created: unknown;
  const store = asStore({
    cattyLearningItem: {
      create: async (value: unknown) => {
        created = value;
        return {};
      },
    },
    teacherProfile: {
      findFirst: async () => {
        profileQueries += 1;
        return { id: "teacher-profile" };
      },
    },
  });

  const forbidden = await createMobileTeacherCattyLearning(
    "teacher-user",
    { category: "PERSONALITY_RULE", notes: "Change the global voice.", title: "Voice" },
    { store },
  );
  assert.deepEqual(forbidden, {
    code: "CATEGORY_FORBIDDEN",
    message: "Esta categoria e reservada para administracao da Catty.",
    ok: false,
  });
  assert.equal(profileQueries, 0);

  const result = await createMobileTeacherCattyLearning(
    "teacher-user",
    {
      category: "VOCABULARY",
      notes: "Explain the word with one short example.",
      tags: ["Vocabulary"],
      title: "New word",
      userPrompt: "What does brave mean?",
    },
    { store },
  );
  assert.equal(result.ok, true);
  assert.deepEqual(created, {
    data: {
      badReply: null,
      category: "VOCABULARY",
      createdByUserId: "teacher-user",
      idealReply: null,
      intent: null,
      notes: "Explain the word with one short example.",
      status: "PENDING",
      tags: ["vocabulary"],
      title: "New word",
      userPrompt: "What does brave mean?",
    },
  });
});

test("forwards artifact writes with the authenticated teacher identity", async () => {
  let upsertInput: unknown;
  let statusInput: unknown;
  const artifact = {
    catchphrasesText: "Level up!",
    emojisText: "🎮",
    isPrimary: true,
    label: "Games",
    soundsText: "pop",
    status: "ACTIVE" as const,
    targetUserId: "student-1",
    themeId: "games",
  };

  const saved = await saveMobileTeacherCattyArtifact(
    "teacher-user",
    artifact,
    {
      upsertArtifact: async (input) => {
        upsertInput = input;
        return { message: "saved", ok: true };
      },
    },
  );
  const changed = await changeMobileTeacherCattyArtifactStatus(
    "teacher-user",
    { artifactId: "artifact-1", isPrimary: false, status: "DISABLED" },
    {
      updateArtifact: async (input) => {
        statusInput = input;
        return { message: "changed", ok: true };
      },
    },
  );

  assert.equal(saved.ok, true);
  assert.equal(changed.ok, true);
  assert.deepEqual(upsertInput, {
    ...artifact,
    actorRole: "TEACHER",
    actorUserId: "teacher-user",
  });
  assert.deepEqual(statusInput, {
    actorRole: "TEACHER",
    actorUserId: "teacher-user",
    artifactId: "artifact-1",
    isPrimary: false,
    status: "DISABLED",
  });
});
