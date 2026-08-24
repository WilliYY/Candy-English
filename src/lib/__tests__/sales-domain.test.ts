import assert from "node:assert/strict";
import test from "node:test";
import {
  areSaleAmountsDatabaseSafe,
  calculateSaleTotals,
  getSaoPauloDateKey,
  getSaoPauloYearMonth,
  isMonthlyInvoiceOpen,
  normalizeSaleProductName,
  parseSaleInvoiceDate,
} from "../sales-domain";

test("normalizes product names for duplicate detection", () => {
  assert.equal(normalizeSaleProductName("  Caderno   Inglês  "), "CADERNO INGLES");
});

test("uses Sao Paulo time when selecting the monthly invoice", () => {
  const beforeMidnightDate = new Date("2026-09-01T02:30:00.000Z");
  const afterMidnightDate = new Date("2026-09-01T03:30:00.000Z");
  const beforeMidnight = getSaoPauloYearMonth(beforeMidnightDate);
  const afterMidnight = getSaoPauloYearMonth(afterMidnightDate);

  assert.deepEqual(beforeMidnight, { month: 8, year: 2026 });
  assert.deepEqual(afterMidnight, { month: 9, year: 2026 });
  assert.equal(getSaoPauloDateKey(beforeMidnightDate), "2026-08-31");
  assert.equal(getSaoPauloDateKey(afterMidnightDate), "2026-09-01");
});

test("parses only real calendar dates for an invoice", () => {
  const parsed = parseSaleInvoiceDate("2026-08-29");

  assert.deepEqual(
    parsed && { day: parsed.day, month: parsed.month, year: parsed.year },
    { day: 29, month: 8, year: 2026 },
  );
  assert.equal(parseSaleInvoiceDate("2026-02-30"), null);
});

test("calculates revenue and frozen cost totals from sale items", () => {
  const totals = calculateSaleTotals([
    { quantity: 2, unitCostCents: 350, unitSalePriceCents: 600 },
    { quantity: 1, unitCostCents: 900, unitSalePriceCents: 1_250 },
  ]);

  assert.deepEqual(totals, {
    costTotalCents: 1_600,
    totalCents: 2_450,
  });
});

test("accepts only an active unpaid monthly invoice", () => {
  assert.equal(isMonthlyInvoiceOpen({ isActive: true, isPaid: false }), true);
  assert.equal(isMonthlyInvoiceOpen({ isActive: true, isPaid: true }), false);
  assert.equal(isMonthlyInvoiceOpen({ isActive: false, isPaid: false }), false);
  assert.equal(isMonthlyInvoiceOpen(null), false);
});

test("rejects totals that overflow PostgreSQL integer cents", () => {
  assert.equal(
    areSaleAmountsDatabaseSafe([
      { quantity: 2, unitCostCents: 500, unitSalePriceCents: 1_000 },
    ]),
    true,
  );
  assert.equal(
    areSaleAmountsDatabaseSafe([
      {
        quantity: 50,
        unitCostCents: 100_000_000,
        unitSalePriceCents: 100_000_000,
      },
    ]),
    false,
  );
});
