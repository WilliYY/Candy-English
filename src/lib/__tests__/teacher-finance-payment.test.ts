import assert from "node:assert/strict";
import test from "node:test";
import { teacherPaymentStatusSchema } from "../validations/teacher-finance";
import {
  canRecordTeacherPayment,
  groupTeacherProductPayments,
  projectTeacherProductPayment,
  validateTeacherPaymentChange,
} from "../teacher-finance-payment";

const input = {
  kind: "TUITION" as const,
  id: "payment-1",
  expectedUpdatedAt: "2026-09-10T12:00:00.000Z",
  isPaid: true,
  confirm: true as const,
};

test("teacher status accepts only the narrow confirmed command", () => {
  assert.equal(teacherPaymentStatusSchema.safeParse(input).success, true);
  for (const extra of [{ amountCents: 1 }, { actorId: "admin" }, { paidAt: null }]) {
    assert.equal(teacherPaymentStatusSchema.safeParse({ ...input, ...extra }).success, false);
  }
  assert.equal(teacherPaymentStatusSchema.safeParse({ ...input, confirm: false }).success, false);
});

test("only active undeleted staff can record or cancel payments", () => {
  for (const role of ["TEACHER", "ADMIN"]) {
    assert.equal(canRecordTeacherPayment({ role, isActive: true, deletedAt: null }), true);
    assert.equal(canRecordTeacherPayment({ role, isActive: false, deletedAt: null }), false);
    assert.equal(canRecordTeacherPayment({ role, isActive: true, deletedAt: new Date() }), false);
  }
  assert.equal(canRecordTeacherPayment({ role: "STUDENT", isActive: true, deletedAt: null }), false);
  assert.equal(canRecordTeacherPayment(null), false);
});

test("version checks reject stale requests, repeated clicks and inactive invoices", () => {
  const current = { isActive: true, isPaid: false, updatedAt: new Date(input.expectedUpdatedAt) };
  assert.doesNotThrow(() => validateTeacherPaymentChange(input, current));
  assert.throws(() => validateTeacherPaymentChange(input, { ...current, isActive: false }));
  assert.throws(() => validateTeacherPaymentChange(input, { ...current, isPaid: true }));
  assert.throws(() => validateTeacherPaymentChange(input, { ...current, updatedAt: new Date() }));
  assert.doesNotThrow(() => validateTeacherPaymentChange({ ...input, isPaid: false }, { ...current, isPaid: true }));
});

test("product status projection never sends amounts, contacts, notes or costs", () => {
  const source = {
    id: "sale-1", buyerUserId: "buyer-1", buyerNameSnapshot: "Aluno Teste", buyerUser: { role: "STUDENT", email: "private" },
    paidAt: null, updatedAt: new Date(input.expectedUpdatedAt), unit: "IVATE" as const,
    createdAt: new Date(input.expectedUpdatedAt), totalCents: 123456, costTotalCents: 7890, note: "private",
    items: [{ productNameSnapshot: "Kit Kat", quantity: 2, unitSalePriceCents: 1200 }],
  };
  const row = projectTeacherProductPayment(source);
  assert.deepEqual(Object.keys(row).sort(), ["buyerUserId", "createdAt", "id", "items", "name", "paidAt", "role", "unit", "updatedAt"]);
  assert.deepEqual(row.items, [{ name: "Kit Kat", quantity: 2 }]);
  assert.equal(JSON.stringify(row).includes("private"), false);
  assert.equal(JSON.stringify(row).includes("Cents"), false);
  const grouped = groupTeacherProductPayments([row, { ...row, id: "sale-2", unit: "DOURADINA" }, { ...row, id: "sale-3", paidAt: row.updatedAt }]);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].pendingSales.length, 2);
  assert.equal(grouped[0].paidSales.length, 1);
  assert.equal(grouped[0].units.length, 2);
});

test("product command requires a unique, versioned, nonempty invoice set", () => {
  const product = { kind: "PRODUCT", id: "buyer", month: 9, year: 2026, isPaid: true, confirm: true, sales: [{ id: "sale-1", updatedAt: input.expectedUpdatedAt }] };
  assert.equal(teacherPaymentStatusSchema.safeParse(product).success, true);
  assert.equal(teacherPaymentStatusSchema.safeParse({ ...product, sales: [] }).success, false);
  assert.equal(teacherPaymentStatusSchema.safeParse({ ...product, sales: [...product.sales, ...product.sales] }).success, false);
});
