CREATE TABLE "FinancialEntry" (
  "id" TEXT NOT NULL,
  "year" INTEGER NOT NULL DEFAULT 2026,
  "month" INTEGER NOT NULL,
  "payerName" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "paymentDay" INTEGER NOT NULL,
  "isPaid" BOOLEAN NOT NULL DEFAULT false,
  "paidAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinancialEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinancialEntry_year_month_paymentDay_idx" ON "FinancialEntry"("year", "month", "paymentDay");
CREATE INDEX "FinancialEntry_isPaid_idx" ON "FinancialEntry"("isPaid");
