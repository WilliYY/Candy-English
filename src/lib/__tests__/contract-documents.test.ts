import assert from "node:assert/strict";
import test from "node:test";

import {
  getContractContentDisposition,
  getContractDocumentAccessScope,
  getContractDocumentDeletionScope,
  hasPdfSignature,
  normalizeContractFileName,
} from "@/lib/contract-documents";

test("scopes contract access by role without exposing another student", () => {
  assert.deepEqual(
    getContractDocumentAccessScope(
      { id: "student-user-1", role: "STUDENT" },
      "contract-1",
    ),
    {
      id: "contract-1",
      OR: [
        { studentProfileId: null },
        { studentProfile: { userId: "student-user-1" } },
      ],
    },
  );

  assert.deepEqual(
    getContractDocumentAccessScope(
      { id: "teacher-user-1", role: "TEACHER" },
      "contract-1",
    ),
    {
      id: "contract-1",
      OR: [
        { studentProfileId: null },
        {
          studentProfile: {
            teacherAssignments: {
              some: { teacherProfile: { userId: "teacher-user-1" } },
            },
          },
        },
      ],
    },
  );

  assert.deepEqual(
    getContractDocumentAccessScope(
      { id: "admin-user-1", role: "ADMIN" },
      "contract-1",
    ),
    { id: "contract-1" },
  );
});

test("scopes contract deletion to admins or teachers linked to the student", () => {
  assert.deepEqual(
    getContractDocumentDeletionScope(
      { id: "admin-user-1", role: "ADMIN" },
      "contract-1",
    ),
    { id: "contract-1" },
  );

  assert.deepEqual(
    getContractDocumentDeletionScope(
      { id: "teacher-user-1", role: "TEACHER" },
      "contract-1",
    ),
    {
      id: "contract-1",
      studentProfileId: { not: null },
      studentProfile: {
        teacherAssignments: {
          some: { teacherProfile: { userId: "teacher-user-1" } },
        },
      },
    },
  );

  assert.equal(
    getContractDocumentDeletionScope(
      { id: "student-user-1", role: "STUDENT" },
      "contract-1",
    ),
    null,
  );
});

test("normalizes download names and prevents header injection", () => {
  assert.equal(normalizeContractFileName("Matrícula 2026"), "Matrícula 2026.pdf");

  const disposition = getContractContentDisposition(
    "contrato.pdf\r\nX-Evil: injected",
  );

  assert.equal(disposition.includes("\r"), false);
  assert.equal(disposition.includes("\n"), false);
  assert.match(disposition, /^attachment; filename=/);
  assert.match(disposition, /filename\*=UTF-8''/);
  assert.match(
    getContractContentDisposition("contrato.pdf", "inline"),
    /^inline; filename=/,
  );
});

test("accepts only files with a PDF signature", () => {
  assert.equal(hasPdfSignature(Buffer.from("%PDF-1.7")), true);
  assert.equal(hasPdfSignature(Buffer.from("<html>")), false);
  assert.equal(hasPdfSignature(Buffer.alloc(0)), false);
});
