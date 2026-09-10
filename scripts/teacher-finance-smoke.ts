import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { getSaoPauloYearMonth } from "../src/lib/sales-domain";

// Only this run's temporary records are touched; no actual customer payments.
const baseUrl = process.env.AUDIT_BASE_URL ?? "http://localhost:3000";
const runId = randomUUID();
const password = randomUUID();
const emails = ["teacher", "student", "admin", "other-teacher"].map((role) => `teacher-finance-${role}-${runId}@example.com`);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const period = { ...getSaoPauloYearMonth(), year: 2026 };
const route = `/ava/teacher?task=financeiro&month=${period.month}`;
const userIds: string[] = [];
const operationIds: string[] = [];
let financialStudentId: string | undefined;
let productId: string | undefined;

function cookies(headers: Headers) {
  return headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
}

async function login(email: string) {
  const csrf = await fetch(new URL("/api/auth/csrf", baseUrl));
  const { csrfToken } = await csrf.json() as { csrfToken: string };
  const response = await fetch(new URL("/api/auth/callback/credentials", baseUrl), {
    method: "POST", redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookies(csrf.headers) },
    body: new URLSearchParams({ email, password, csrfToken, json: "true" }),
  });
  const cookie = `${cookies(csrf.headers)}; ${cookies(response.headers)}`;
  const session = await fetch(new URL("/api/auth/session", baseUrl), { headers: { cookie } });
  assert.equal(((await session.json()) as { user?: { email: string } }).user?.email, email);
  return cookie;
}

async function page(cookie: string, path = route) {
  const response = await fetch(new URL(path, baseUrl), { headers: { cookie } });
  assert.equal(response.status, 200);
  return response.text();
}

async function actionId(html: string) {
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);
  for (const src of scripts.filter((src) => src.includes("/ava/teacher/"))) {
    const script = await (await fetch(new URL(src, baseUrl))).text();
    const id = /createServerReference\)\("([a-f0-9]{40,})",[^)]*"setTeacherPaymentStatus"\)/.exec(script)?.[1];
    if (id) return id;
  }
  throw new Error("Teacher payment Server Action not found in candidate bundle");
}

async function invoke(cookie: string, id: string, input: unknown) {
  const response = await fetch(new URL(route, baseUrl), {
    method: "POST",
    headers: { cookie, origin: new URL(baseUrl).origin, "next-action": id, "content-type": "application/json", accept: "text/x-component" },
    body: JSON.stringify([input]),
  });
  assert.equal(response.ok, true, `Server Action HTTP ${response.status}`);
  for (const line of (await response.text()).split("\n")) {
    const object = /^[\da-f]+:(\{.*\})$/.exec(line)?.[1];
    if (!object) continue;
    const result = JSON.parse(object) as { ok?: boolean; message?: string };
    if (typeof result.ok === "boolean") return result;
  }
  throw new Error("Missing payment result");
}

async function main() {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required");
  const passwordHash = await hash(password, 12);
  const users = [];
  for (const [index, role] of (["TEACHER", "STUDENT", "ADMIN", "TEACHER"] as const).entries()) {
    const user = await prisma.user.create({ data: {
      email: emails[index], name: `Finance Smoke ${role} ${index} ${runId}`, role, passwordHash,
      ...(role === "STUDENT" ? { studentProfile: { create: { unit: "IVATE" } } } : {}),
    }, include: { studentProfile: true } });
    users.push(user); userIds.push(user.id);
  }
  const [teacher, student, admin, otherTeacher] = users;
  const financial = await prisma.financialStudent.create({ data: {
    name: student.name, studentProfileId: student.studentProfile!.id, amountCents: 87654321, paymentDay: 10,
    payments: { create: { ...period, snapshotName: student.name, snapshotAmountCents: 87654321, snapshotPaymentDay: 10, note: `PRIVATE-${runId}` } },
  }, include: { payments: true } });
  financialStudentId = financial.id;
  const payment = financial.payments[0];
  const product = await prisma.saleProduct.create({ data: { name: `Doce Smoke ${runId}`, normalizedName: `DOCE SMOKE ${runId}`, stockQuantity: 10, costCents: 100, salePriceCents: 300 } });
  productId = product.id;
  async function saleFor(buyer: typeof student, linked = false) {
    const operationId = `teacher-finance-${randomUUID()}`;
    operationIds.push(operationId);
    return prisma.sale.create({ data: {
      operationId, buyerUserId: buyer.id, buyerStudentProfileId: buyer.studentProfile?.id,
      buyerNameSnapshot: buyer.name, unit: "IVATE", settlementType: "MONTHLY_INVOICE",
      invoiceMonth: period.month, invoiceYear: period.year,
      ...(linked ? { financialPaymentId: payment.id, financialStudentId: financial.id } : {}),
      totalCents: 7654321, costTotalCents: 100, soldByUserId: teacher.id,
      items: { create: { productId: product.id, productNameSnapshot: product.name, quantity: 1, unitCostCents: 100, unitSalePriceCents: 7654321, lineCostCents: 100, lineTotalCents: 7654321 } },
    } });
  }
  const linked = await saleFor(student, true);
  const separate = await saleFor(student);
  const separate2 = await saleFor(student);
  const staffSale = await saleFor(otherTeacher);
  const cookie = await login(teacher.email);
  const html = await page(cookie);
  const action = await actionId(html);
  assert.ok(html.includes("Marcar como pago"));
  assert.ok(html.includes(product.name));
  for (const secret of ["87654321", "7654321", `PRIVATE-${runId}`]) assert.equal(html.includes(secret), false, "Teacher HTML/RSC must not expose other buyers' amounts or notes");

  const tuitionCommand = { kind: "TUITION", id: payment.id, expectedUpdatedAt: payment.updatedAt.toISOString(), isPaid: true, confirm: true };
  assert.equal((await invoke("", action, tuitionCommand)).ok, false);
  assert.equal((await invoke(await login(student.email), action, tuitionCommand)).ok, false);
  assert.equal((await invoke(cookie, action, { ...tuitionCommand, amountCents: 1 })).ok, false);
  assert.equal((await invoke(cookie, action, { ...tuitionCommand, confirm: false })).ok, false);
  const results = await Promise.all([invoke(cookie, action, tuitionCommand), invoke(cookie, action, tuitionCommand)]);
  assert.equal(results.filter((result) => result.ok).length, 1);
  const paid = await prisma.financialPayment.findUniqueOrThrow({ where: { id: payment.id } });
  assert.equal(paid.isPaid, true); assert.ok(paid.paidAt);
  assert.equal(paid.snapshotAmountCents, 87654321);
  assert.equal(await prisma.financialLog.count({ where: { paymentId: payment.id, action: "TEACHER_TUITION_PAID", createdByUserId: teacher.id } }), 1);
  assert.equal((await invoke(cookie, action, { ...tuitionCommand, isPaid: false })).ok, false);
  assert.equal((await invoke(cookie, action, { ...tuitionCommand, isPaid: false, expectedUpdatedAt: paid.updatedAt.toISOString() })).ok, true);
  assert.equal((await prisma.financialPayment.findUniqueOrThrow({ where: { id: payment.id } })).paidAt, null);
  console.log("OK actual Teacher action, hidden amounts, permissions, concurrent duplicate, tuition confirm/cancel and audited identity");

  for (const sales of [[separate, separate2], [staffSale]]) {
    const input = { kind: "PRODUCT", id: sales[0].buyerUserId, ...period, sales: sales.map((sale) => ({ id: sale.id, updatedAt: sale.updatedAt.toISOString() })), isPaid: true, confirm: true };
    if (sales.length > 1) assert.equal((await invoke(cookie, action, { ...input, sales: input.sales.slice(0, 1) })).ok, false);
    assert.equal((await invoke(cookie, action, input)).ok, true);
    const paidSales = await prisma.sale.findMany({ where: { id: { in: sales.map((sale) => sale.id) } } });
    assert.ok(paidSales.every((sale) => sale.paidAt));
    assert.equal((await invoke(cookie, action, { ...input, isPaid: false, sales: paidSales.map((sale) => ({ id: sale.id, updatedAt: sale.updatedAt.toISOString() })) })).ok, true);
    assert.equal(await prisma.sale.count({ where: { id: { in: sales.map((sale) => sale.id) }, paidAt: { not: null } } }), 0);
  }
  assert.equal((await invoke(cookie, action, { kind: "PRODUCT", id: student.id, ...period, sales: [{ id: linked.id, updatedAt: linked.updatedAt.toISOString() }], isPaid: true, confirm: true })).ok, false);
  await prisma.financialPayment.update({ where: { id: payment.id }, data: { isActive: false } });
  const inactive = await prisma.financialPayment.findUniqueOrThrow({ where: { id: payment.id } });
  assert.equal((await invoke(cookie, action, { ...tuitionCommand, expectedUpdatedAt: inactive.updatedAt.toISOString() })).ok, false);
  const logs = await prisma.financialLog.findMany({ where: { createdByUserId: teacher.id } });
  assert.equal(logs.length, 6);
  assert.ok(logs.every((log) => log.description.includes(teacher.name) && !log.description.includes("centavos")));
  const adminHtml = await page(await login(admin.email), `/ava/admin?task=financeiro&month=${period.month}`);
  assert.ok(adminHtml.includes(teacher.name) && adminHtml.includes("cancelou a confirmação de pagamento"));
  await prisma.user.update({ where: { id: teacher.id }, data: { isActive: false } });
  assert.equal((await invoke(cookie, action, tuitionCommand)).ok, false);
  assert.equal((await prisma.saleProduct.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity, 10);
  assert.equal((await prisma.sale.findUniqueOrThrow({ where: { id: linked.id } })).financialPaymentId, payment.id);
  console.log("OK student/staff candy confirm/cancel, linked-candy guard, inactive guard, admin history, unchanged stock and tuition snapshot");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Teacher finance smoke failed");
  process.exitCode = 1;
}).finally(async () => {
  await prisma.financialLog.deleteMany({ where: { createdByUserId: { in: userIds } } });
  await prisma.sale.deleteMany({ where: { operationId: { in: operationIds } } });
  if (productId) await prisma.saleProduct.delete({ where: { id: productId } });
  if (financialStudentId) await prisma.financialStudent.delete({ where: { id: financialStudentId } });
  await prisma.loginAttempt.deleteMany({ where: { email: { in: emails } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect(); await pool.end();
  console.log("Teacher finance smoke fixtures cleaned");
});
