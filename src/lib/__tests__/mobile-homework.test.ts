import assert from "node:assert/strict";
import test from "node:test";

import { canStudentAccessHomework } from "@/lib/homework-submission-service";
import { hasInteractiveHomeworkDrawingContent } from "@/lib/interactive-homework-fields";
import { readInteractiveAnswers } from "@/lib/interactive-homework-service";

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

test("reads only valid interactive answers from stored JSON", () => {
  assert.deepEqual(
    readInteractiveAnswers([
      { fieldId: "field-1", value: "Hello" },
      { fieldId: "field-2", value: "true" },
      { fieldId: 123, value: "invalid" },
      null,
    ]),
    [
      { fieldId: "field-1", value: "Hello" },
      { fieldId: "field-2", value: "true" },
    ],
  );
});

test("accepts only drawings with finite points inside the canvas", () => {
  assert.equal(
    hasInteractiveHomeworkDrawingContent(
      JSON.stringify({ strokes: [[[10, 20]]] }),
    ),
    true,
  );
  assert.equal(
    hasInteractiveHomeworkDrawingContent(
      JSON.stringify({ strokes: [[[Number.NaN, 20]]] }),
    ),
    false,
  );
  assert.equal(
    hasInteractiveHomeworkDrawingContent(
      JSON.stringify({ strokes: [[[101, 20]]] }),
    ),
    false,
  );
  assert.equal(
    hasInteractiveHomeworkDrawingContent(
      JSON.stringify({ strokes: [[["10", 20]]] }),
    ),
    false,
  );
});
