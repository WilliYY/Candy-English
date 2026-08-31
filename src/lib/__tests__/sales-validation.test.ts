import assert from "node:assert/strict";
import test from "node:test";
import {
  saleCheckoutSchema,
  saleProductCreateSchema,
  staffInvoiceSettlementSchema,
} from "../validations/sales";

const checkoutItem = {
  expectedSalePriceCents: 600,
  expectedUpdatedAt: "2026-08-23T12:00:00.000Z",
  productId: "product-1",
  quantity: 1,
};

test("accepts a product with prices in cents and non-negative stock", () => {
  const result = saleProductCreateSchema.safeParse({
    costCents: 350,
    name: "Caderno Candy",
    salePriceCents: 600,
    stockQuantity: 12,
  });

  assert.equal(result.success, true);
});

test("rejects products with negative stock", () => {
  const result = saleProductCreateSchema.safeParse({
    costCents: 350,
    name: "Caderno Candy",
    salePriceCents: 600,
    stockQuantity: -1,
  });

  assert.equal(result.success, false);
});

test("requires a registered student or teacher for a monthly invoice", () => {
  const result = saleCheckoutSchema.safeParse({
    buyerName: "Aluno digitado",
    invoiceDueDate: "2026-08-29",
    items: [checkoutItem],
    paymentMethod: null,
    settlementType: "MONTHLY_INVOICE",
    studentProfileId: null,
  });

  assert.equal(result.success, false);
});

test("accepts a registered teacher account for a monthly invoice", () => {
  const result = saleCheckoutSchema.safeParse({
    buyerName: "",
    buyerUserId: "teacher-user-1",
    invoiceDueDate: "2026-08-29",
    items: [checkoutItem],
    paymentMethod: null,
    settlementType: "MONTHLY_INVOICE",
    studentProfileId: null,
  });

  assert.equal(result.success, true);
});

test("rejects checkout linked to a student and teacher at the same time", () => {
  const result = saleCheckoutSchema.safeParse({
    buyerName: "",
    buyerUserId: "teacher-user-1",
    invoiceDueDate: "2026-08-29",
    items: [checkoutItem],
    paymentMethod: null,
    settlementType: "MONTHLY_INVOICE",
    studentProfileId: "student-1",
  });

  assert.equal(result.success, false);
});

test("requires a valid billing date for a monthly invoice", () => {
  const result = saleCheckoutSchema.safeParse({
    buyerName: "",
    invoiceDueDate: "2026-02-30",
    items: [checkoutItem],
    paymentMethod: null,
    settlementType: "MONTHLY_INVOICE",
    studentProfileId: "student-1",
  });

  assert.equal(result.success, false);
});

test("accepts a registered student and billing date for a monthly invoice", () => {
  const result = saleCheckoutSchema.safeParse({
    buyerName: "",
    invoiceDueDate: "2026-08-29",
    items: [checkoutItem],
    paymentMethod: null,
    settlementType: "MONTHLY_INVOICE",
    studentProfileId: "student-1",
  });

  assert.equal(result.success, true);
});

test("requires a payment method for an immediate sale", () => {
  const result = saleCheckoutSchema.safeParse({
    buyerName: "Responsavel do aluno",
    items: [checkoutItem],
    paymentMethod: null,
    settlementType: "PAID_NOW",
    studentProfileId: null,
  });

  assert.equal(result.success, false);
});

test("accepts free text buyer only for an immediate paid sale", () => {
  const result = saleCheckoutSchema.safeParse({
    buyerName: "Responsavel do aluno",
    items: [{ ...checkoutItem, quantity: 2 }],
    paymentMethod: "PIX",
    settlementType: "PAID_NOW",
    studentProfileId: null,
  });

  assert.equal(result.success, true);
});

test("rejects duplicate products in the same checkout payload", () => {
  const result = saleCheckoutSchema.safeParse({
    buyerName: "Aluno Candy",
    items: [
      checkoutItem,
      { ...checkoutItem, quantity: 2 },
    ],
    paymentMethod: "CASH",
    settlementType: "PAID_NOW",
    studentProfileId: null,
  });

  assert.equal(result.success, false);
});

test("accepts an explicit set of teacher sales for admin settlement", () => {
  const result = staffInvoiceSettlementSchema.safeParse({
    buyerUserId: "teacher-user-1",
    isPaid: true,
    month: 8,
    saleIds: ["sale-1", "sale-2"],
    year: 2026,
  });

  assert.equal(result.success, true);
});

test("rejects duplicate sale ids in teacher invoice settlement", () => {
  const result = staffInvoiceSettlementSchema.safeParse({
    buyerUserId: "teacher-user-1",
    isPaid: true,
    month: 8,
    saleIds: ["sale-1", "sale-1"],
    year: 2026,
  });

  assert.equal(result.success, false);
});
