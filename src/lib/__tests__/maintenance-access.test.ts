import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAccessSessionProblem } from "../mobile-auth/session-policy";
import * as tokens from "../mobile-auth/tokens";
import * as responses from "../mobile-auth/api-response";
import * as roles from "../roles";

function load(path: string, dependencies: Record<string, unknown>) {
  const source = readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
  const context = {
    exports: {}, Date, Response,
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  };
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
  return context.exports as Record<string, (...args: never[]) => Promise<unknown>>;
}

function fixture(role: roles.Role = "STUDENT") {
  let maintenance = false;
  let revoked = 0;
  let operations = 0;
  const token = tokens.createMobileToken("access").value;
  const user = { id: "user-1", name: "Test", email: "test@example.invalid", role };
  let settingsReads = 0;
  const settings = load("lib/app-settings.ts", {
    "@/lib/prisma": { getPrisma: () => ({ appSetting: { findUnique: async () => {
      settingsReads++;
      return { value: maintenance ? "on" : "off" };
    } } }) },
  });
  const store = {
    mobileSession: {
      findUnique: async () => ({
        id: "session-1", deviceId: "device-1", device: { installationId: "install-1" },
        accessExpiresAt: new Date(Date.now() + 60000), revokedAt: null,
        sessionVersion: 0, user: { ...user, isActive: true, sessionVersion: 0 },
        lastUsedAt: new Date(),
      }),
      update: async () => { revoked++; },
    },
  };
  const mobile = load("lib/mobile-auth/access-session.ts", {
    "@/lib/mobile-auth/config": { MOBILE_LAST_USED_WRITE_INTERVAL_MS: 60000 },
    "@/lib/mobile-auth/session-policy": { getAccessSessionProblem },
    "@/lib/mobile-auth/tokens": tokens,
    "@/lib/prisma": { getPrisma: () => store },
    "@/lib/app-settings": settings,
  });
  const authorization = load("lib/authorization.ts", {
    "next/navigation": { redirect: () => { throw new Error("Unexpected redirect"); } },
    "@/lib/auth": { auth: async () => ({ user }) },
    "@/lib/roles": roles,
    "@/lib/app-settings": settings,
  });
  return {
    authorization, mobile, token, user, settings,
    maintenance: (enabled: boolean) => { maintenance = enabled; },
    revoked: () => revoked, operations: () => operations, settingsReads: () => settingsReads,
    operation: async () => { operations++; return { ok: true, data: {} }; },
  };
}

test("previous mobile access token is temporarily blocked without revocation", async () => {
  const state = fixture();
  const authorize = state.mobile.authorizeMobileAccess as (token: string) => Promise<{ ok: boolean; code?: string }>;
  assert.equal((await authorize(state.token)).ok, true);
  state.maintenance(true);
  const denied = await authorize(state.token);
  assert.equal(denied.ok, false);
  assert.equal(denied.code, "MANUTENCAO");
  assert.equal(state.revoked(), 0);
  state.maintenance(false);
  assert.equal((await authorize(state.token)).ok, true);
});

test("maintenance allows staff mobile sessions and web operations", async () => {
  for (const role of ["ADMIN", "TEACHER"] as const) {
    const state = fixture(role);
    state.maintenance(true);
    const authorize = state.mobile.authorizeMobileAccess as (token: string) => Promise<{ ok: boolean }>;
    assert.equal((await authorize(state.token)).ok, true);
    const session = await state.authorization.authForAvaOperation();
    assert.equal((session as { user: { role: string } }).user.role, role);
    assert.equal(state.settingsReads(), 0);
  }
});

test("web operation guard blocks a previous session and restores it after maintenance", async () => {
  const state = fixture();
  assert.ok(await state.authorization.authForAvaOperation());
  state.maintenance(true);
  assert.equal(await state.authorization.authForAvaOperation(), null);
  state.maintenance(false);
  assert.ok(await state.authorization.authForAvaOperation());
});

test("mobile homework write rejects maintenance before touching the submission service", async () => {
  const state = fixture();
  const route = load("app/api/mobile/v1/homeworks/[homeworkId]/submit/route.ts", {
    zod: { z },
    "@/lib/homework-submission-service": { submitStudentTextHomework: state.operation },
    "@/lib/mobile-auth/access-session": state.mobile,
    "@/lib/mobile-auth/api-response": responses,
    "@/lib/mobile-auth/tokens": tokens,
  });
  state.maintenance(true);
  const post = route.POST as (request: Request, context: unknown) => Promise<Response>;
  const response = await post(new Request("https://example.invalid", {
    method: "POST", headers: { authorization: `Bearer ${state.token}` }, body: JSON.stringify({ answer: "Hello" }),
  }), { params: Promise.resolve({ homeworkId: "homework-1" }) });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, "MANUTENCAO");
  assert.equal(state.operations(), 0);
});

test("mobile homework read and protected downloads reject maintenance before data or storage", async () => {
  for (const path of [
    "app/api/mobile/v1/homeworks/[homeworkId]/route.ts",
    "app/api/mobile/v1/contracts/[contractId]/route.ts",
    "app/api/mobile/v1/candy-xp/[activityId]/asset/route.ts",
  ]) {
    const state = fixture();
    const route = load(path, {
      "node:fs/promises": { readFile: state.operation },
      "@/lib/mobile-auth/access-session": state.mobile,
      "@/lib/mobile-auth/api-response": responses,
      "@/lib/mobile-auth/tokens": tokens,
      "@/lib/mobile-homework": { getMobileStudentHomework: state.operation },
      "@/lib/contract-documents": { getAuthorizedContractDocument: state.operation },
      "@/lib/candy-xp-submission-service": { getMobileStudentCandyXpAsset: state.operation },
      "@/lib/storage": {},
    });
    state.maintenance(true);
    const get = route.GET as (request: Request, context: unknown) => Promise<Response>;
    const response = await get(new Request("https://example.invalid", {
      headers: { authorization: `Bearer ${state.token}` },
    }), { params: Promise.resolve({ homeworkId: "homework-1", contractId: "contract-1", activityId: "activity-1" }) });
    assert.equal(response.status, 503, path);
    assert.equal((await response.json()).error.code, "MANUTENCAO");
    assert.equal(state.operations(), 0);
  }
});

test("web protected downloads reject a previous student session before storage or data reads", async () => {
  for (const path of [
    "app/ava/homework-assets/[homeworkId]/route.ts",
    "app/ava/homework-listening/[fieldId]/route.ts",
    "app/ava/candy-xp-assets/[activityId]/route.ts",
    "app/ava/contracts/[contractId]/route.ts",
  ]) {
    const state = fixture();
    const route = load(path, {
      "node:fs/promises": { readFile: state.operation },
      "next/server": { NextResponse },
      "@/lib/authorization": state.authorization,
      "@/lib/auth": { auth: async () => ({ user: state.user }) },
      "@/lib/app-settings": state.settings,
      "@/lib/prisma": { getPrisma: () => { throw new Error("Unexpected data read"); } },
      "@/lib/roles": roles,
      "@/lib/contract-documents": { getAuthorizedContractDocument: state.operation },
      "@/lib/storage": {},
      "@/lib/listening-tts": {},
      "@/lib/homework-submission-service": {},
    });
    state.maintenance(true);
    const get = route.GET as (request: Request, context: unknown) => Promise<Response>;
    const response = await get(new Request("https://example.invalid"), { params: Promise.resolve({}) });
    assert.equal(response.status, 503, path);
    assert.equal(state.operations(), 0);
  }
});

test("web student writes reject a previous session before submission and autosave", async () => {
  const state = fixture();
  const actions = load("app/ava/student/actions.ts", {
    "next/cache": {},
    "@/lib/authorization": state.authorization,
    "@/lib/postgres-advisory-lock": {},
    "@/lib/prisma": { getPrisma: () => { throw new Error("Unexpected data read"); } },
    "@/lib/roles": roles,
    "@/lib/homework-submission-service": { submitStudentTextHomework: state.operation },
    "@/lib/interactive-homework-service": {
      saveStudentInteractiveHomeworkDraft: state.operation,
      submitStudentInteractiveHomework: state.operation,
    },
    "@/lib/validations/learning": {},
  });
  state.maintenance(true);
  for (const action of ["submitHomework", "saveInteractiveHomeworkDraft", "submitInteractiveHomework", "reopenInteractiveHomeworkDraft"]) {
    const result = await (actions[action] as (input: unknown) => Promise<{ ok: boolean }>)({});
    assert.equal(result.ok, false, action);
  }
  assert.equal(state.operations(), 0);
});
