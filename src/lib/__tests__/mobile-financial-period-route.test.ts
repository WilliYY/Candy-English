import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { financialPeriodCandidatesSchema, openFinancialPeriodSchema } from "../validations/financial-period";
const source = readFileSync(new URL("../../app/api/mobile/v1/admin/finance/periods/route.ts", import.meta.url), "utf8");
function fixture(role = "ADMIN") {
  let writes = 0;
  let reads = 0;
  const dependencies: Record<string, unknown> = {
    "next/cache": { revalidatePath: () => {} },
    "@/lib/mobile-auth/access-session": { authorizeMobileAccess: async () => ({ ok: true, user: { id: "admin", role } }) },
    "@/lib/mobile-auth/tokens": { parseBearerToken: (header: string) => header === "Bearer fixture" ? "fixture" : null },
    "@/lib/mobile-auth/api-response": {
      getMobileRequestId: () => "request",
      mobileError: (code: string, message: string, status: number) => Response.json({ ok: false, code, message }, { status }),
      mobileJson: (body: unknown, status: number) => Response.json(body, { status }),
    },
    "@/lib/financial-period-operations": {
      FinancialPeriodError: Error,
      listFinancialPeriodCandidates: async () => { reads++; return { students: [{ id: "student", name: "Fixture", unit: "IVATE" }], nextCursor: null }; },
      openFinancialPeriod: async () => { writes++; return { created: true, paymentId: "payment" }; },
    },
    "@/lib/validations/financial-period": { financialPeriodCandidatesSchema, openFinancialPeriodSchema },
  };
  const context = { exports: {}, URL, Response, require: (name: string) => dependencies[name] };
  runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context);
  return { ...(context.exports as { GET: (request: Request) => Promise<Response>; POST: (request: Request) => Promise<Response> }), writes: () => writes, reads: () => reads };
}
const query = "https://example.test/api/mobile/v1/admin/finance/periods?year=2027&month=1&unit=IVATE";
function request(token = true, body?: unknown) {
  return new Request(query, { method: body ? "POST" : "GET", headers: token ? { authorization: "Bearer fixture" } : {}, ...(body ? { body: JSON.stringify(body) } : {}) });
}
test("financial period API rejects missing sessions and non-admin roles before accessing data", async () => {
  for (const role of ["ADMIN", "TEACHER", "STUDENT"]) {
    const state = fixture(role);
    const response = await state.GET(request(role !== "ADMIN"));
    assert.equal(response.status, role === "ADMIN" ? 401 : 403);
    assert.equal(state.reads(), 0);
    assert.equal(state.writes(), 0);
  }
});
test("financial period API reads candidates without creating and requires explicit confirmation to write", async () => {
  const state = fixture();
  assert.equal((await state.GET(request())).status, 200);
  assert.equal(state.reads(), 1);
  assert.equal(state.writes(), 0);
  assert.equal((await state.POST(request(true, { studentId: "student", year: 2027, month: 1, confirmCreate: false }))).status, 400);
  assert.equal(state.writes(), 0);
  const result = await state.POST(request(true, { studentId: "student", year: 2027, month: 1, confirmCreate: true }));
  assert.equal(result.status, 201);
  assert.equal((await result.json()).paymentId, "payment");
  assert.equal(state.writes(), 1);
});
