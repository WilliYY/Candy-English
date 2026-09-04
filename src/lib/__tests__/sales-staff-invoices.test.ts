import assert from "node:assert/strict";
import test from "node:test";
import { groupStaffInvoices } from "../staff-invoices";

const baseSale = {
  buyerEmail: "teacher@candy.com",
  buyerName: "Teacher Candy",
  buyerRole: "TEACHER" as const,
  buyerUserId: "teacher-1",
  createdAt: "2026-08-20T14:00:00.000Z",
  invoiceDueDate: "2026-08-29",
  invoiceMonth: 8,
  invoiceYear: 2026,
  items: [
    {
      id: "item-1",
      lineTotalCents: 600,
      productNameSnapshot: "Doce Candy",
      quantity: 2,
      unitSalePriceCents: 300,
    },
  ],
  paidAt: null,
  saleId: "sale-1",
  totalCents: 600,
  unit: "IVATE" as const,
};

test("groups a teacher personal invoice and totals only candy purchases", () => {
  const invoices = groupStaffInvoices([baseSale], 2026, 8);

  assert.equal(invoices.length, 1);
  assert.equal(invoices[0]?.buyerUserId, "teacher-1");
  assert.equal(invoices[0]?.pendingTotalCents, 600);
  assert.equal(invoices[0]?.paidTotalCents, 0);
  assert.deepEqual(invoices[0]?.pendingSaleIds, ["sale-1"]);
  assert.equal(invoices[0]?.items[0]?.category, "CANDY");
});

test("keeps paid and pending teacher purchases separated in the same month", () => {
  const invoices = groupStaffInvoices(
    [
      baseSale,
      {
        ...baseSale,
        items: [
          {
            ...baseSale.items[0],
            id: "item-2",
            lineTotalCents: 450,
            quantity: 1,
            unitSalePriceCents: 450,
          },
        ],
        paidAt: "2026-08-25T12:00:00.000Z",
        saleId: "sale-2",
        totalCents: 450,
      },
    ],
    2026,
    8,
  );

  assert.equal(invoices[0]?.pendingTotalCents, 600);
  assert.equal(invoices[0]?.paidTotalCents, 450);
  assert.deepEqual(invoices[0]?.paidSaleIds, ["sale-2"]);
});

test("does not mix another competence into the teacher invoice", () => {
  const invoices = groupStaffInvoices(
    [{ ...baseSale, invoiceMonth: 9 }],
    2026,
    8,
  );

  assert.deepEqual(invoices, []);
});

test("identifies a standalone product invoice that belongs to a student", () => {
  const invoices = groupStaffInvoices(
    [
      {
        ...baseSale,
        buyerEmail: "student@candy.com",
        buyerName: "Student Candy",
        buyerRole: "STUDENT" as const,
        buyerUserId: "student-1",
      },
    ],
    2026,
    8,
  );

  assert.equal(invoices[0]?.buyerRole, "STUDENT");
  assert.equal(invoices[0]?.pendingTotalCents, 600);
});
