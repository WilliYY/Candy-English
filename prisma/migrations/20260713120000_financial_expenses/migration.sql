-- CreateTable
CREATE TABLE "FinancialExpense" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL DEFAULT 2026,
    "month" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amountCents" INTEGER NOT NULL,
    "actorName" TEXT NOT NULL,
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialExpense_year_month_purchasedAt_idx" ON "FinancialExpense"("year", "month", "purchasedAt");

-- CreateIndex
CREATE INDEX "FinancialExpense_createdByUserId_idx" ON "FinancialExpense"("createdByUserId");

-- AddForeignKey
ALTER TABLE "FinancialExpense" ADD CONSTRAINT "FinancialExpense_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
