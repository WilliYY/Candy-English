import assert from "node:assert/strict";
import test from "node:test";

import {
  getMobileTeacherContracts,
  type MobileTeacherContractsStore,
} from "../mobile-teacher-contracts";

function asStore(value: unknown) {
  return value as MobileTeacherContractsStore;
}

const createdAt = new Date("2026-08-01T19:00:00.000Z");

test("returns an empty protected module when the teacher profile is unavailable", async () => {
  let contractQueries = 0;
  const result = await getMobileTeacherContracts("teacher-user", {
    store: asStore({
      contractDocument: {
        findMany: async () => {
          contractQueries += 1;
          return [];
        },
      },
      teacherProfile: { findUnique: async () => null },
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.data?.profileFound, false);
  assert.deepEqual(result.data?.items, []);
  assert.equal(contractQueries, 0);
});

test("lists every staff contract without storage paths", async () => {
  let query: unknown;
  const result = await getMobileTeacherContracts("teacher-user", {
    store: asStore({
      contractDocument: {
        findMany: async (args: unknown) => {
          query = args;
          return [
            {
              createdAt,
              fileName: "student.pdf",
              id: "contract-1",
              mimeType: "application/pdf",
              sizeBytes: 2048,
              studentProfile: { user: { name: "Student One" } },
              title: "Student contract",
            },
            {
              createdAt,
              fileName: "general.pdf",
              id: "contract-2",
              mimeType: "application/pdf",
              sizeBytes: 1024,
              studentProfile: null,
              title: "General terms",
            },
          ];
        },
      },
      teacherProfile: { findUnique: async () => ({ id: "teacher-1" }) },
    }),
  });

  assert.equal(result.ok, true);
  assert.deepEqual((query as { where: unknown }).where, {});
  assert.equal((query as { take: number }).take, 51);
  assert.deepEqual(result.data?.items, [
    {
      detail: "Student One",
      fileName: "student.pdf",
      id: "contract-1",
      mimeType: "application/pdf",
      occurredAt: createdAt.toISOString(),
      sizeBytes: 2048,
      subtitle: "student.pdf",
      title: "Student contract",
    },
    {
      detail: "Documento geral",
      fileName: "general.pdf",
      id: "contract-2",
      mimeType: "application/pdf",
      occurredAt: createdAt.toISOString(),
      sizeBytes: 1024,
      subtitle: "general.pdf",
      title: "General terms",
    },
  ]);
  assert.equal("storagePath" in (result.data?.items[0] ?? {}), false);
});

test("refuses to truncate more contracts than the mobile module can show", async () => {
  const result = await getMobileTeacherContracts("teacher-user", {
    store: asStore({
      contractDocument: {
        findMany: async () =>
          Array.from({ length: 51 }, (_, index) => ({
            createdAt,
            fileName: `contract-${index}.pdf`,
            id: `contract-${index}`,
            mimeType: "application/pdf",
            sizeBytes: 1024,
            studentProfile: null,
            title: `Contract ${index}`,
          })),
      },
      teacherProfile: { findUnique: async () => ({ id: "teacher-1" }) },
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "LIMIT_EXCEEDED");
  assert.equal(result.data, undefined);
});
