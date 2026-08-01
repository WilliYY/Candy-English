import assert from "node:assert/strict";
import test from "node:test";

import {
  createMobileAdminContract,
  getMobileAdminContract,
  getMobileAdminContracts,
  MobileAdminContractsError,
  type MobileAdminContractsStore,
} from "../mobile-admin-contracts";

function asStore(value: unknown) {
  return value as MobileAdminContractsStore;
}

const admin = {
  email: "admin@candy.test",
  id: "admin-user",
  name: "Admin Candy",
  role: "ADMIN" as const,
};
const createdAt = new Date("2026-08-01T20:00:00.000Z");
const studentContract = {
  createdAt,
  fileName: "matricula.pdf",
  id: "contract-1",
  mimeType: "application/pdf",
  sizeBytes: 2_048,
  studentProfile: { id: "student-1", user: { name: "Ana Student" } },
  title: "Contrato de matricula",
  uploadedByUser: { name: "Admin Candy" },
};

test("requires ADMIN before querying contracts", async () => {
  let queries = 0;
  await assert.rejects(
    () =>
      getMobileAdminContracts(
        { ...admin, role: "TEACHER" },
        {},
        {
          store: asStore({
            contractDocument: {
              count: async () => 0,
              findMany: async () => {
                queries += 1;
                return [];
              },
            },
            studentProfile: { findMany: async () => [] },
          }),
        },
      ),
    (error) =>
      error instanceof MobileAdminContractsError &&
      error.code === "ROLE_FORBIDDEN",
  );
  assert.equal(queries, 0);
});

test("rejects unknown filters instead of widening the catalog", async () => {
  await assert.rejects(
    () =>
      getMobileAdminContracts(admin, { unexpected: true }, { store: asStore({}) }),
    (error) =>
      error instanceof MobileAdminContractsError &&
      error.code === "INVALID_QUERY",
  );
});

test("lists a bounded page with filters, summary and safe student options", async () => {
  const calls: { count: unknown[]; findMany?: unknown; students?: unknown } = {
    count: [],
  };
  const result = await getMobileAdminContracts(
    admin,
    {
      assignment: "STUDENT",
      cursor: "contract-previous",
      limit: "1",
      query: "Ana",
    },
    {
      now: () => createdAt,
      store: asStore({
        contractDocument: {
          count: async (args: unknown) => {
            calls.count.push(args);
            return calls.count.length === 1 ? 5 : calls.count.length === 2 ? 2 : 3;
          },
          findMany: async (args: unknown) => {
            calls.findMany = args;
            return [
              studentContract,
              { ...studentContract, id: "contract-2", title: "Contrato 2" },
            ];
          },
        },
        studentProfile: {
          findMany: async (args: unknown) => {
            calls.students = args;
            return [
              { id: "student-1", user: { name: "Ana Student" } },
              { id: "student-2", user: { name: "Bruno Student" } },
            ];
          },
        },
      }),
    },
  );

  assert.equal(result.hasMore, true);
  assert.equal(result.nextCursor, "contract-1");
  assert.deepEqual(result.summary, {
    general: 2,
    studentSpecific: 3,
    total: 5,
  });
  assert.deepEqual(result.students, [
    { id: "student-1", name: "Ana Student" },
    { id: "student-2", name: "Bruno Student" },
  ]);
  assert.deepEqual(result.contracts, [
    {
      createdAt: createdAt.toISOString(),
      fileName: "matricula.pdf",
      id: "contract-1",
      mimeType: "application/pdf",
      sizeBytes: 2_048,
      student: { id: "student-1", name: "Ana Student" },
      title: "Contrato de matricula",
      uploadedByName: "Admin Candy",
    },
  ]);
  assert.equal("storagePath" in result.contracts[0], false);
  assert.deepEqual(
    (calls.findMany as { cursor: unknown; skip: number; take: number }).cursor,
    { id: "contract-previous" },
  );
  assert.equal(
    (calls.findMany as { cursor: unknown; skip: number; take: number }).skip,
    1,
  );
  assert.equal(
    (calls.findMany as { cursor: unknown; skip: number; take: number }).take,
    2,
  );
  const where = (calls.findMany as { where: Record<string, unknown> }).where;
  assert.equal(where.studentProfileId !== undefined, true);
  assert.equal(Array.isArray(where.OR), true);
});

test("returns one safe contract detail and hides missing ids", async () => {
  const detail = await getMobileAdminContract(admin, "contract-1", {
    store: asStore({
      contractDocument: { findFirst: async () => studentContract },
    }),
  });
  assert.equal(detail.id, "contract-1");
  assert.equal("storagePath" in detail, false);

  await assert.rejects(
    () =>
      getMobileAdminContract(admin, "missing", {
        store: asStore({ contractDocument: { findFirst: async () => null } }),
      }),
    (error) =>
      error instanceof MobileAdminContractsError && error.code === "NOT_FOUND",
  );
});

test("rejects a fake PDF before writing private storage", async () => {
  let saves = 0;
  const file = new File(["not a pdf"], "fake.pdf", {
    type: "application/pdf",
  });
  await assert.rejects(
    () =>
      createMobileAdminContract(
        admin,
        {
          confirmUpload: true,
          operationId: "9dfda8f1-4c48-4302-a2a1-5611d652e151",
          studentProfileId: null,
          title: "Contrato geral",
        },
        file,
        {
          saveContract: async () => {
            saves += 1;
            throw new Error("must not save");
          },
          store: asStore({
            contractDocument: { findUnique: async () => null },
          }),
        },
      ),
    (error) =>
      error instanceof MobileAdminContractsError && error.code === "INVALID_FILE",
  );
  assert.equal(saves, 0);
});

test("replays an already confirmed upload without storing the PDF again", async () => {
  let saves = 0;
  const result = await createMobileAdminContract(
    admin,
    {
      confirmUpload: true,
      operationId: "9dfda8f1-4c48-4302-a2a1-5611d652e151",
      studentProfileId: "student-1",
      title: "Contrato de matricula",
    },
    new File(["retry payload"], "retry.pdf", { type: "application/pdf" }),
    {
      saveContract: async () => {
        saves += 1;
        throw new Error("must not save");
      },
      store: asStore({
        contractDocument: { findUnique: async () => studentContract },
      }),
    },
  );
  assert.equal(result.replayed, true);
  assert.equal(result.contract.id, "contract-1");
  assert.equal(saves, 0);

  await assert.rejects(
    () =>
      createMobileAdminContract(
        admin,
        {
          confirmUpload: true,
          operationId: "9dfda8f1-4c48-4302-a2a1-5611d652e151",
          studentProfileId: null,
          title: "Outro contrato",
        },
        new File(["retry payload"], "retry.pdf", {
          type: "application/pdf",
        }),
        {
          saveContract: async () => {
            saves += 1;
            throw new Error("must not save");
          },
          store: asStore({
            contractDocument: { findUnique: async () => studentContract },
          }),
        },
      ),
    (error) =>
      error instanceof MobileAdminContractsError &&
      error.code === "OPERATION_CONFLICT",
  );
  assert.equal(saves, 0);
});

test("uploads a signed PDF for an active student and returns safe metadata", async () => {
  let createData: unknown;
  const file = new File(["%PDF-1.7\nCandy"], "signed.pdf", {
    type: "application/pdf",
  });
  const result = await createMobileAdminContract(
    admin,
    {
      confirmUpload: true,
      operationId: "9dfda8f1-4c48-4302-a2a1-5611d652e151",
      studentProfileId: "student-1",
      title: "Contrato de matricula",
    },
    file,
    {
      saveContract: async () => ({
        mimeType: "application/pdf",
        originalName: "signed.pdf",
        relativePath: "contracts/private.pdf",
        sizeBytes: file.size,
      }),
      store: asStore({
        contractDocument: {
          create: async (args: { data: unknown }) => {
            createData = args.data;
            return { ...studentContract, fileName: "signed.pdf", sizeBytes: file.size };
          },
          findUnique: async () => null,
        },
        studentProfile: {
          findFirst: async () => ({ id: "student-1" }),
        },
      }),
    },
  );

  assert.equal(result.replayed, false);
  assert.equal(result.contract.fileName, "signed.pdf");
  assert.equal("storagePath" in result.contract, false);
  assert.deepEqual(createData, {
    createdByMobileOperationId: "9dfda8f1-4c48-4302-a2a1-5611d652e151",
    fileName: "signed.pdf",
    mimeType: "application/pdf",
    sizeBytes: file.size,
    storagePath: "contracts/private.pdf",
    studentProfileId: "student-1",
    title: "Contrato de matricula",
    uploadedByUserId: "admin-user",
  });
});
