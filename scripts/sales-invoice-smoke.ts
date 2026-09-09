import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { getSaoPauloYearMonth } from "../src/lib/sales-domain";

// Exercises the real authenticated Server Action, not a copy of its SQL.
// All writes use fixtures owned by this run and are removed in finally.
const baseUrl = process.env.AUDIT_BASE_URL ?? "http://localhost:3000";
const runId = randomUUID();
const password = randomUUID();
const emails = ["teacher", "student"].map((role) => `sales-smoke-${role}-${runId}@example.com`);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const current = getSaoPauloYearMonth();
const next = current.month === 12 ? { year: current.year + 1, month: 1 } : { ...current, month: current.month + 1 };
const operations: string[] = [];
let productId: string | undefined;
let financialStudentId: string | undefined;

function cookies(headers: Headers) {
  return headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
}

async function login(email = emails[0]) {
  const csrf = await fetch(new URL("/api/auth/csrf", baseUrl));
  const { csrfToken } = await csrf.json() as { csrfToken: string };
  const response = await fetch(new URL("/api/auth/callback/credentials", baseUrl), {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookies(csrf.headers) },
    body: new URLSearchParams({ email, password, csrfToken, json: "true" }),
  });
  const cookie = `${cookies(csrf.headers)}; ${cookies(response.headers)}`;
  const session = await fetch(new URL("/api/auth/session", baseUrl), { headers: { cookie } });
  const body = await session.json() as { user?: { email: string } };
  assert.equal(body.user?.email, email, "Fixture login must succeed");
  return cookie;
}

async function actionId(cookie: string, name: string) {
  const response = await fetch(new URL("/ava/vendas", baseUrl), { headers: { cookie } });
  assert.equal(response.ok, true);
  const html = await response.text();
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);
  for (const src of scripts.filter((src) => src.includes("/ava/vendas/"))) {
    const script = await (await fetch(new URL(src, baseUrl))).text();
    const pattern = new RegExp(`createServerReference\\)\\("([a-f0-9]{40,})",[^)]*"${name}"\\)`);
    const id = pattern.exec(script)?.[1];
    if (id) return id;
  }
  throw new Error(`Cannot discover ${name} in the deployed sales bundle`);
}

async function invoke(cookie: string, id: string, input: unknown) {
  const response = await fetch(new URL("/ava/vendas", baseUrl), {
    method: "POST",
    headers: { cookie, origin: new URL(baseUrl).origin, "next-action": id, "content-type": "application/json", accept: "text/x-component" },
    body: JSON.stringify([input]),
  });
  assert.equal(response.ok, true, `Server Action HTTP ${response.status}`);
  const text = await response.text();
  for (const line of text.split("\n")) {
    const object = /^[\da-f]+:(\{.*\})$/.exec(line)?.[1];
    if (!object) continue;
    const result = JSON.parse(object) as { ok?: boolean; message?: string };
    if (typeof result.ok === "boolean") return result;
  }
  throw new Error("Server Action did not return a sale result");
}

async function main() {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required");
  const passwordHash = await hash(password, 12);
  await prisma.user.create({ data: { email: emails[0], name: "Sales Smoke Teacher", role: "TEACHER", passwordHash } });
  const student = await prisma.user.create({ data: { email: emails[1], name: "Sales Smoke Student", role: "STUDENT", passwordHash, studentProfile: { create: { unit: "IVATE" } } }, include: { studentProfile: true } });
  const profileId = student.studentProfile!.id;
  const financial = await prisma.financialStudent.create({
    data: { name: "Sales Smoke Student", studentProfileId: profileId, amountCents: 20000, paymentDay: 10,
      payments: { create: [current, next].map((period) => ({ ...period, snapshotName: "Sales Smoke Student", snapshotAmountCents: 20000, snapshotPaymentDay: 10 })) } },
    include: { payments: true },
  });
  financialStudentId = financial.id;
  const thisPayment = financial.payments.find((payment) => payment.month === current.month && payment.year === current.year)!;
  const nextPayment = financial.payments.find((payment) => payment.month === next.month && payment.year === next.year)!;
  const product = await prisma.saleProduct.create({ data: { name: `Kit Kat Smoke ${runId}`, normalizedName: `KIT KAT SMOKE ${runId}`, costCents: 100, salePriceCents: 300, stockQuantity: 10 } });
  productId = product.id;
  const cookie = await login();
  const createId = await actionId(cookie, "createSale");
  const cancelId = await actionId(cookie, "cancelSale");
  const payload = async (quantity: number) => {
    const latest = await prisma.saleProduct.findUniqueOrThrow({ where: { id: product.id } });
    const operationId = `sales-smoke-${randomUUID()}`;
    operations.push(operationId);
    return { buyerName: "", buyerUserId: null, studentProfileId: profileId, unit: "IVATE", settlementType: "MONTHLY_INVOICE", paymentMethod: null,
      invoiceDueDate: `${current.year}-${String(current.month).padStart(2, "0")}-10`, operationId,
      items: [{ productId: product.id, quantity, expectedSalePriceCents: latest.salePriceCents, expectedUpdatedAt: latest.updatedAt.toISOString() }] };
  };
  const first = await payload(2);
  assert.equal((await invoke("", createId, first)).ok, false);
  assert.equal((await invoke(await login(emails[1]), createId, first)).ok, false);
  assert.equal((await prisma.saleProduct.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity, 10);
  console.log("OK anonymous and student checkout rejected without stock changes");
  const results = await Promise.all([invoke(cookie, createId, first), invoke(cookie, createId, first)]);
  for (const result of results) assert.equal(result.ok, true, result.message);
  const sale = await prisma.sale.findUniqueOrThrow({ where: { operationId: first.operationId }, include: { items: true } });
  assert.equal(sale.financialPaymentId, thisPayment.id);
  assert.equal(sale.totalCents, 600);
  assert.equal(sale.items[0].quantity, 2);
  assert.equal(sale.items[0].unitSalePriceCents, 300);
  assert.equal(sale.items[0].productNameSnapshot, product.name);
  const invoice = await prisma.financialPayment.findUniqueOrThrow({ where: { id: thisPayment.id }, include: { sales: { where: { status: "COMPLETED" } } } });
  assert.equal(invoice.snapshotAmountCents + invoice.sales.reduce((total, charge) => total + charge.totalCents, 0), 20600);
  assert.equal((await prisma.financialPayment.findUniqueOrThrow({ where: { id: thisPayment.id } })).snapshotAmountCents, 20000);
  assert.equal((await invoke(cookie, createId, first)).ok, true);
  assert.equal((await prisma.saleProduct.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity, 8);
  console.log("OK open monthly invoice, itemized cents, frozen tuition and idempotent stock");

  await prisma.financialPayment.update({ where: { id: thisPayment.id }, data: { isPaid: true, paidAt: new Date() } });
  const second = await payload(1);
  assert.equal((await invoke(cookie, createId, second)).ok, true);
  const moved = await prisma.sale.findUniqueOrThrow({ where: { operationId: second.operationId } });
  assert.equal(moved.financialPaymentId, nextPayment.id);
  assert.equal(moved.invoiceMonth, next.month);
  assert.equal(moved.invoiceYear, next.year);
  assert.equal(moved.invoiceDueDate?.getUTCMonth(), next.month - 1);
  assert.equal((await prisma.financialPayment.findUniqueOrThrow({ where: { id: thisPayment.id } })).isPaid, true);
  console.log("OK paid invoice preserved; new purchase routed to next month");

  await prisma.financialPayment.update({ where: { id: thisPayment.id }, data: { isPaid: false, isActive: false } });
  const third = await payload(1);
  assert.equal((await invoke(cookie, createId, third)).ok, true);
  assert.equal((await prisma.sale.findUniqueOrThrow({ where: { operationId: third.operationId } })).financialPaymentId, nextPayment.id);
  console.log("OK inactive invoice routes to next month");

  await prisma.financialPayment.update({ where: { id: nextPayment.id }, data: { isPaid: true } });
  const blocked = await payload(1);
  assert.equal((await invoke(cookie, createId, blocked)).ok, false);
  assert.equal(await prisma.sale.count({ where: { operationId: blocked.operationId } }), 0);
  assert.equal((await prisma.saleProduct.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity, 6);
  console.log("OK unavailable next invoice rolls back without consuming stock");

  await prisma.financialPayment.update({ where: { id: thisPayment.id }, data: { isActive: true, paidAt: null } });
  assert.equal((await invoke(cookie, cancelId, { saleId: sale.id, reason: "Smoke fixture cancellation" })).ok, true);
  assert.equal((await prisma.saleProduct.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity, 8);
  await prisma.saleProduct.update({ where: { id: product.id }, data: { stockQuantity: 0 } });
  assert.equal((await invoke(cookie, createId, await payload(1))).ok, false);
  assert.equal((await prisma.saleProduct.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity, 0);
  console.log("OK reversal restores stock and zero stock rejects checkout");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Sales invoice smoke failed");
  process.exitCode = 1;
}).finally(async () => {
  await prisma.sale.deleteMany({ where: { operationId: { in: operations } } });
  if (productId) await prisma.saleProduct.delete({ where: { id: productId } });
  if (financialStudentId) await prisma.financialStudent.delete({ where: { id: financialStudentId } });
  await prisma.loginAttempt.deleteMany({ where: { email: { in: emails } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.$disconnect();
  await pool.end();
  console.log("Sales smoke fixtures cleaned");
});
