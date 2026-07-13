CREATE TYPE "FinancialUnit" AS ENUM ('IVATE', 'DOURADINA');

ALTER TABLE "FinancialStudent"
ADD COLUMN "unit" "FinancialUnit" NOT NULL DEFAULT 'IVATE';

ALTER TABLE "FinancialPayment"
ADD COLUMN "snapshotUnit" "FinancialUnit" NOT NULL DEFAULT 'IVATE';

ALTER TABLE "FinancialExpense"
ADD COLUMN "unit" "FinancialUnit" NOT NULL DEFAULT 'IVATE';

CREATE INDEX "FinancialStudent_unit_paymentDay_name_idx" ON "FinancialStudent"("unit", "paymentDay", "name");

CREATE INDEX "FinancialPayment_year_month_snapshotUnit_isActive_idx" ON "FinancialPayment"("year", "month", "snapshotUnit", "isActive");

CREATE INDEX "FinancialExpense_year_month_unit_purchasedAt_idx" ON "FinancialExpense"("year", "month", "unit", "purchasedAt");
