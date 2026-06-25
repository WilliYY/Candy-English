-- Add optional installment metadata for the simplified manual finance flow.
-- Existing rows keep NULL values and continue to behave as recurring monthly charges.
ALTER TABLE "FinancialStudent"
  ADD COLUMN "installmentsTotal" INTEGER;

ALTER TABLE "FinancialPayment"
  ADD COLUMN "snapshotInstallmentNumber" INTEGER,
  ADD COLUMN "snapshotInstallmentsTotal" INTEGER;
