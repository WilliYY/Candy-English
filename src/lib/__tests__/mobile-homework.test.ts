import assert from "node:assert/strict";
import test from "node:test";

import { canStudentAccessHomework } from "@/lib/homework-submission-service";

test("allows homework linked directly to the student lesson", () => {
  assert.equal(
    canStudentAccessHomework(
      {
        lesson: { studentProfileId: "student-1" },
        studentAssignments: [],
      },
      "student-1",
    ),
    true,
  );
});

test("allows homework explicitly assigned to the student", () => {
  assert.equal(
    canStudentAccessHomework(
      {
        lesson: { studentProfileId: "another-student" },
        studentAssignments: [{ studentProfileId: "student-1" }],
      },
      "student-1",
    ),
    true,
  );
});

test("rejects an assignment that belongs to another student", () => {
  assert.equal(
    canStudentAccessHomework(
      {
        lesson: { studentProfileId: "another-student" },
        studentAssignments: [{ studentProfileId: "student-2" }],
      },
      "student-1",
    ),
    false,
  );
});

test("rejects homework outside the student scope", () => {
  assert.equal(
    canStudentAccessHomework(
      {
        lesson: { studentProfileId: "another-student" },
        studentAssignments: [],
      },
      "student-1",
    ),
    false,
  );
});
