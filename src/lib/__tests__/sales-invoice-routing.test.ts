import assert from "node:assert/strict";
import test from "node:test";
import { planStudentSaleInvoice, getSaleInvoiceDateForPeriod } from "../sales-domain";

const current = { year: 2026, month: 9 };
const open = { ...current, id: "current", isActive: true, isPaid: false };
const next = { ...open, id: "next", month: 10 };

test("links an open tuition invoice in the current month", () => {
  const plan = planStudentSaleInvoice(current, "student", [open, next]);
  assert.equal(plan.financialPaymentId, "current");
  assert.equal(plan.month, 9);
  assert.equal(plan.kind, "MONTHLY_PAYMENT");
});

test("paid or inactive current tuition routes to next month without reopening it", () => {
  for (const closed of [{ ...open, isPaid: true }, { ...open, isActive: false }]) {
    const plan = planStudentSaleInvoice(current, "student", [closed, next]);
    assert.equal(plan.financialPaymentId, "next");
    assert.equal(plan.month, 10);
    assert.equal(plan.year, 2026);
    assert.equal(plan.kind, "MONTHLY_PAYMENT");
  }
});

test("unavailable next invoice blocks instead of charging a closed month", () => {
  for (const payments of [[{ ...open, isPaid: true }], [{ ...open, isPaid: true }, { ...next, isPaid: true }]]) {
    const plan = planStudentSaleInvoice(current, "student", payments);
    assert.equal(plan.kind, "UNAVAILABLE");
    assert.equal(plan.financialPaymentId, null);
    assert.equal(plan.month, 10);
  }
});

test("students without tuition keep the existing product-only invoice", () => {
  assert.equal(planStudentSaleInvoice(current, null, []).kind, "PRODUCT_ONLY");
  assert.equal(planStudentSaleInvoice(current, "student", []).month, 9);
});

test("December rolls to January of the next year", () => {
  const period = { year: 2026, month: 12 };
  const plan = planStudentSaleInvoice(period, "student", [
    { ...open, ...period, isPaid: true },
    { ...next, year: 2027, month: 1 },
  ]);
  assert.equal(plan.financialPaymentId, "next");
  assert.equal(plan.year, 2027);
  assert.equal(plan.month, 1);
});

test("invoice day is preserved and clamped to a valid day in the target month", () => {
  assert.equal(getSaleInvoiceDateForPeriod("2026-09-10", { year: 2026, month: 10 }), "2026-10-10");
  assert.equal(getSaleInvoiceDateForPeriod("2026-01-31", { year: 2026, month: 2 }), "2026-02-28");
  assert.equal(getSaleInvoiceDateForPeriod("2028-01-31", { year: 2028, month: 2 }), "2028-02-29");
});
