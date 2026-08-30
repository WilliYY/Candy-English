import assert from "node:assert/strict";
import test from "node:test";

import { canActorUseActiveChatPair } from "@/lib/chat-service";

const pair = {
  hasExistingStudentAccess: false,
  studentUserId: "student-user",
  teacherUserId: "teacher-user",
};

test("Admin e a Teacher da conversa podem iniciar chat com qualquer aluno ativo", () => {
  assert.equal(
    canActorUseActiveChatPair({ role: "ADMIN", userId: "admin-user" }, pair),
    true,
  );
  assert.equal(
    canActorUseActiveChatPair(
      { role: "TEACHER", userId: "teacher-user" },
      pair,
    ),
    true,
  );
  assert.equal(
    canActorUseActiveChatPair(
      { role: "TEACHER", userId: "other-teacher" },
      pair,
    ),
    false,
  );
});

test("Student responde somente conversa propria ja aberta ou vinculada", () => {
  assert.equal(
    canActorUseActiveChatPair(
      { role: "STUDENT", userId: "student-user" },
      pair,
    ),
    false,
  );
  assert.equal(
    canActorUseActiveChatPair(
      { role: "STUDENT", userId: "student-user" },
      { ...pair, hasExistingStudentAccess: true },
    ),
    true,
  );
  assert.equal(
    canActorUseActiveChatPair(
      { role: "STUDENT", userId: "other-student" },
      { ...pair, hasExistingStudentAccess: true },
    ),
    false,
  );
});
