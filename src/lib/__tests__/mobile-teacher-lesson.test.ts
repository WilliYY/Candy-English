import assert from "node:assert/strict";
import test from "node:test";

import {
  getMobileTeacherLesson,
  type MobileTeacherLessonStore,
} from "@/lib/mobile-teacher-lesson";

function createStore(options?: {
  lessonExists?: boolean;
  profileId?: string | null;
}) {
  const calls: Record<string, unknown> = {};
  const store = {
    lesson: {
      findFirst: async (args: unknown) => {
        calls.lesson = args;

        if (options?.lessonExists === false) {
          return null;
        }

        return {
          description: "Conversation practice",
          homeworks: [
            {
              dueDate: new Date("2026-08-07T12:00:00.000Z"),
              id: "homework-1",
              status: "DRAFT",
              title: "Speaking prompts",
            },
          ],
          id: "lesson-1",
          materials: [
            {
              content: null,
              id: "material-safe",
              title: "Video",
              type: "LINK",
              url: "https://example.com/video",
            },
            {
              content: null,
              id: "material-unsafe",
              title: "Unsafe",
              type: "LINK",
              url: "https://user:secret@example.com/private",
            },
          ],
          scheduledAt: new Date("2026-08-01T12:00:00.000Z"),
          status: "DRAFT",
          studentProfile: {
            user: { name: "Candy Student" },
          },
          teacherProfile: {
            user: { name: "Candy Teacher" },
          },
          title: "Introductions",
          vocabularyItems: [
            {
              example: "Nice to meet you.",
              id: "word-1",
              term: "meet",
              translation: "conhecer",
            },
          ],
        };
      },
    },
    teacherProfile: {
      findUnique: async (args: unknown) => {
        calls.teacherProfile = args;
        return options?.profileId === null
          ? null
          : { id: options?.profileId ?? "teacher-1" };
      },
    },
  } as unknown as MobileTeacherLessonStore;

  return { calls, store };
}

test("limits lesson detail to the authenticated teacher profile", async () => {
  const { calls, store } = createStore();

  const result = await getMobileTeacherLesson(
    "teacher-user",
    "lesson-1",
    { store },
  );

  assert.equal(result.ok, true);
  assert.deepEqual(
    (calls.teacherProfile as { where: unknown }).where,
    { userId: "teacher-user" },
  );
  assert.deepEqual(
    (calls.lesson as { where: unknown }).where,
    {
      id: "lesson-1",
      teacherProfileId: "teacher-1",
    },
  );
});

test("does not query lessons when the teacher profile is not linked", async () => {
  const { calls, store } = createStore({ profileId: null });
  const result = await getMobileTeacherLesson(
    "teacher-user",
    "lesson-1",
    { store },
  );

  assert.deepEqual(result, {
    message: "Perfil de teacher não encontrado.",
    ok: false,
  });
  assert.equal("lesson" in calls, false);
});

test("returns draft lesson materials without exposing unsafe links", async () => {
  const { store } = createStore();
  const result = await getMobileTeacherLesson(
    "teacher-user",
    "lesson-1",
    { store },
  );

  assert.equal(result.data?.status, "DRAFT");
  assert.equal(result.data?.studentName, "Candy Student");
  assert.deepEqual(result.data?.homeworks, [
    {
      dueDate: "2026-08-07T12:00:00.000Z",
      id: "homework-1",
      status: "DRAFT",
      title: "Speaking prompts",
    },
  ]);
  assert.deepEqual(
    result.data?.materials.map((material) => material.url),
    ["https://example.com/video", null],
  );
});

test("returns not found for a lesson owned by another teacher", async () => {
  const { store } = createStore({ lessonExists: false });
  const result = await getMobileTeacherLesson(
    "teacher-user",
    "lesson-other",
    { store },
  );

  assert.deepEqual(result, {
    message: "Aula não encontrada ou indisponível.",
    ok: false,
  });
});
