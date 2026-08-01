ALTER TABLE "FinancialPayment"
ADD COLUMN "lastMobileOperationId" TEXT;

CREATE UNIQUE INDEX "FinancialPayment_lastMobileOperationId_key"
ON "FinancialPayment"("lastMobileOperationId");

ALTER TABLE "FinancialExpense"
ADD COLUMN "createdByMobileOperationId" TEXT;

CREATE UNIQUE INDEX "FinancialExpense_createdByMobileOperationId_key"
ON "FinancialExpense"("createdByMobileOperationId");
