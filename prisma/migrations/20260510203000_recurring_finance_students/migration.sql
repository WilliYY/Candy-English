CREATE TABLE "FinancialStudent" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "paymentDay" INTEGER NOT NULL,
  "paymentMethod" TEXT NOT NULL DEFAULT 'PIX',
  "phone" TEXT,
  "cpf" TEXT,
  "email" TEXT,
  "address" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinancialStudent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialPayment" (
  "id" TEXT NOT NULL,
  "year" INTEGER NOT NULL DEFAULT 2026,
  "month" INTEGER NOT NULL,
  "studentId" TEXT NOT NULL,
  "isPaid" BOOLEAN NOT NULL DEFAULT false,
  "paidAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinancialPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialLog" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "studentId" TEXT,
  "paymentId" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FinancialLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinancialStudent_paymentDay_name_idx" ON "FinancialStudent"("paymentDay", "name");
CREATE UNIQUE INDEX "FinancialPayment_studentId_year_month_key" ON "FinancialPayment"("studentId", "year", "month");
CREATE INDEX "FinancialPayment_year_month_isPaid_idx" ON "FinancialPayment"("year", "month", "isPaid");
CREATE INDEX "FinancialPayment_isPaid_idx" ON "FinancialPayment"("isPaid");
CREATE INDEX "FinancialLog_createdAt_idx" ON "FinancialLog"("createdAt");
CREATE INDEX "FinancialLog_studentId_idx" ON "FinancialLog"("studentId");

ALTER TABLE "FinancialPayment" ADD CONSTRAINT "FinancialPayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "FinancialStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialLog" ADD CONSTRAINT "FinancialLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "FinancialStudent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialLog" ADD CONSTRAINT "FinancialLog_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "FinancialPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialLog" ADD CONSTRAINT "FinancialLog_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "FinancialStudent" (
  "id",
  "name",
  "amountCents",
  "paymentDay",
  "paymentMethod",
  "createdAt",
  "updatedAt"
)
SELECT
  'finstu_' || md5("id"),
  "payerName",
  "amountCents",
  "paymentDay",
  'OTHER',
  "createdAt",
  "updatedAt"
FROM "FinancialEntry";

INSERT INTO "FinancialPayment" (
  "id",
  "year",
  "month",
  "studentId",
  "isPaid",
  "paidAt",
  "note",
  "createdAt",
  "updatedAt"
)
SELECT
  'finpay_' || md5("id"),
  "year",
  "month",
  'finstu_' || md5("id"),
  "isPaid",
  "paidAt",
  "note",
  "createdAt",
  "updatedAt"
FROM "FinancialEntry";

DROP TABLE "FinancialEntry";
