import assert from "node:assert/strict";
import test from "node:test";

import {
  convertMobileAdminPreRegistration,
  MobileAdminPreRegistrationConversionError,
} from "../mobile-admin-pre-registration-conversion";

const admin = {
  email: "admin@candy.example",
  id: "admin-1",
  name: "Admin Candy",
  role: "ADMIN" as const,
};
const input = {
  confirmConversion: true as const,
  confirmMissingAgendaData: false,
  confirmMissingFinancialData: false,
  emailForLogin: "student@example.com",
  expectedUpdatedAt: "2026-08-01T12:00:00.000Z",
  initialPassword: "StrongPass123",
  operationId: "11111111-1111-4111-8111-111111111111",
};

function detail(overrides: Record<string, unknown> = {}) {
  return {
    agenda: { complete: true },
    canConvert: true,
    finance: { complete: true },
    id: "pre-1",
    updatedAt: input.expectedUpdatedAt,
    ...overrides,
  };
}

test("rejects non-admin conversion before loading personal data", async () => {
  let touched = false;
  await assert.rejects(
    () =>
      convertMobileAdminPreRegistration(
        { ...admin, role: "TEACHER" },
        "pre-1",
        input,
        {
          executeConversion: async () => (touched = true, { ok: true }),
          getDetail: async () => (touched = true, detail()),
        } as never,
      ),
    (error: unknown) =>
      error instanceof MobileAdminPreRegistrationConversionError &&
      error.code === "ROLE_FORBIDDEN",
  );
  assert.equal(touched, false);
});

test("requires explicit confirmation for incomplete finance and agenda", async () => {
  let executed = false;
  await assert.rejects(
    () =>
      convertMobileAdminPreRegistration(admin, "pre-1", input, {
        executeConversion: async () => (executed = true, { ok: true }),
        getDetail: async () =>
          detail({
            agenda: { complete: false },
            finance: { complete: false },
          }),
      } as never),
    (error: unknown) =>
      error instanceof MobileAdminPreRegistrationConversionError &&
      error.code === "MISSING_DATA_CONFIRMATION",
  );
  assert.equal(executed, false);
});

test("refuses conversion when the pre-registration changed after review", async () => {
  let executed = false;
  await assert.rejects(
    () =>
      convertMobileAdminPreRegistration(admin, "pre-1", input, {
        executeConversion: async () => (executed = true, { ok: true }),
        getDetail: async () =>
          detail({ updatedAt: "2026-08-01T12:01:00.000Z" }),
      } as never),
    (error: unknown) =>
      error instanceof MobileAdminPreRegistrationConversionError &&
      error.code === "EDIT_CONFLICT",
  );
  assert.equal(executed, false);
});

test("lets a converted request reach the core for idempotent replay", async () => {
  let executeCount = 0;
  let loadCount = 0;
  const result = await convertMobileAdminPreRegistration(
    admin,
    "pre-1",
    input,
    {
      executeConversion: async () => {
        executeCount += 1;
        return { message: "Aluno ja convertido por esta operacao.", ok: true };
      },
      getDetail: async () => {
        loadCount += 1;
        return detail({
          canConvert: false,
          converted: true,
          updatedAt: "2026-08-01T12:01:00.000Z",
        });
      },
    } as never,
  );

  assert.equal(executeCount, 1);
  assert.equal(loadCount, 2);
  assert.equal(result.message, "Aluno ja convertido por esta operacao.");
});

test("executes confirmed conversion and returns refreshed detail without the password", async () => {
  const calls: unknown[] = [];
  let loadCount = 0;
  const result = await convertMobileAdminPreRegistration(
    admin,
    "pre-1",
    {
      ...input,
      confirmMissingAgendaData: true,
      confirmMissingFinancialData: true,
    },
    {
      executeConversion: async (request: unknown) => {
        calls.push(request);
        return { message: "Aluno convertido com AVA.", ok: true };
      },
      getDetail: async () => {
        loadCount += 1;
        return detail(
          loadCount === 1
            ? { agenda: { complete: false }, finance: { complete: false } }
            : { canConvert: false, converted: true },
        );
      },
    } as never,
  );

  assert.equal(calls.length, 1);
  assert.deepEqual(result, {
    message: "Aluno convertido com AVA.",
    preRegistration: detail({ canConvert: false, converted: true }),
  });
  assert.equal(JSON.stringify(result).includes("StrongPass123"), false);
});
