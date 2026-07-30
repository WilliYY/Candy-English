import assert from "node:assert/strict";
import test from "node:test";

import {
  getMobileStudentLessonScope,
  normalizeExternalMaterialUrl,
} from "@/lib/mobile-lesson";

test("allows only external HTTPS material links without embedded credentials", () => {
  assert.equal(
    normalizeExternalMaterialUrl("https://example.com/material?id=1"),
    "https://example.com/material?id=1",
  );
  assert.equal(
    normalizeExternalMaterialUrl("http://example.com/material"),
    null,
  );
  assert.equal(normalizeExternalMaterialUrl("javascript:alert(1)"), null);
  assert.equal(normalizeExternalMaterialUrl("file:///etc/passwd"), null);
  assert.equal(
    normalizeExternalMaterialUrl("https://user:secret@example.com/material"),
    null,
  );
  assert.equal(normalizeExternalMaterialUrl("not a URL"), null);
});

test("scopes lesson reads to published records owned by the student", () => {
  assert.deepEqual(getMobileStudentLessonScope("student-1"), {
    status: "PUBLISHED",
    studentProfileId: "student-1",
  });
  assert.deepEqual(getMobileStudentLessonScope("student-1", "lesson-1"), {
    id: "lesson-1",
    status: "PUBLISHED",
    studentProfileId: "student-1",
  });
});
