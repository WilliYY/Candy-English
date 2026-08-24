CREATE TYPE "SaleSettlementType" AS ENUM ('PAID_NOW', 'MONTHLY_INVOICE');
CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'CANCELED');

ALTER TABLE "FinancialStudent"
ADD COLUMN "studentProfileId" TEXT;

UPDATE "FinancialStudent" AS financial_student
SET "studentProfileId" = registration."convertedStudentProfileId"
FROM "StudentPreRegistration" AS registration
WHERE registration."convertedFinancialStudentId" = financial_student."id"
  AND registration."convertedStudentProfileId" IS NOT NULL;

-- Legacy/manual financial records are linked only by an exact, unambiguous email.
UPDATE "FinancialStudent" AS financial_student
SET "studentProfileId" = profile."id"
FROM "StudentProfile" AS profile
JOIN "User" AS student_user ON student_user."id" = profile."userId"
WHERE financial_student."studentProfileId" IS NULL
  AND financial_student."email" IS NOT NULL
  AND LOWER(financial_student."email") = LOWER(student_user."email")
  AND NOT EXISTS (
    SELECT 1
    FROM "FinancialStudent" AS linked_financial_student
    WHERE linked_financial_student."studentProfileId" = profile."id"
  )
  AND (
    SELECT COUNT(*)
    FROM "FinancialStudent" AS candidate
    WHERE candidate."email" IS NOT NULL
      AND LOWER(candidate."email") = LOWER(financial_student."email")
  ) = 1;

CREATE UNIQUE INDEX "FinancialStudent_studentProfileId_key"
ON "FinancialStudent"("studentProfileId");

ALTER TABLE "FinancialStudent"
ADD CONSTRAINT "FinancialStudent_studentProfileId_fkey"
FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SaleProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "costCents" INTEGER NOT NULL,
    "salePriceCents" INTEGER NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleProduct_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SaleProduct_costCents_check" CHECK ("costCents" >= 0),
    CONSTRAINT "SaleProduct_salePriceCents_check" CHECK ("salePriceCents" > 0),
    CONSTRAINT "SaleProduct_stockQuantity_check" CHECK ("stockQuantity" >= 0)
);

CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "buyerStudentProfileId" TEXT,
    "financialStudentId" TEXT,
    "financialPaymentId" TEXT,
    "buyerNameSnapshot" TEXT NOT NULL,
    "unit" "FinancialUnit" NOT NULL,
    "settlementType" "SaleSettlementType" NOT NULL,
    "paymentMethod" TEXT,
    "invoiceYear" INTEGER,
    "invoiceMonth" INTEGER,
    "totalCents" INTEGER NOT NULL,
    "costTotalCents" INTEGER NOT NULL,
    "note" TEXT,
    "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "paidAt" TIMESTAMP(3),
    "soldByUserId" TEXT,
    "canceledAt" TIMESTAMP(3),
    "canceledByUserId" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Sale_totalCents_check" CHECK ("totalCents" > 0),
    CONSTRAINT "Sale_costTotalCents_check" CHECK ("costTotalCents" >= 0),
    CONSTRAINT "Sale_invoiceMonth_check" CHECK ("invoiceMonth" IS NULL OR "invoiceMonth" BETWEEN 1 AND 12),
    CONSTRAINT "Sale_settlement_check" CHECK (
      (
        "settlementType" = 'PAID_NOW'
        AND "paymentMethod" IS NOT NULL
        AND "invoiceYear" IS NULL
        AND "invoiceMonth" IS NULL
        AND "paidAt" IS NOT NULL
      )
      OR
      (
        "settlementType" = 'MONTHLY_INVOICE'
        AND "paymentMethod" IS NULL
        AND "invoiceYear" IS NOT NULL
        AND "invoiceMonth" IS NOT NULL
        AND "paidAt" IS NULL
      )
    )
);

CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCostCents" INTEGER NOT NULL,
    "unitSalePriceCents" INTEGER NOT NULL,
    "lineCostCents" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SaleItem_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "SaleItem_unitCostCents_check" CHECK ("unitCostCents" >= 0),
    CONSTRAINT "SaleItem_unitSalePriceCents_check" CHECK ("unitSalePriceCents" > 0),
    CONSTRAINT "SaleItem_lineCostCents_check" CHECK ("lineCostCents" >= 0),
    CONSTRAINT "SaleItem_lineTotalCents_check" CHECK ("lineTotalCents" > 0)
);

CREATE UNIQUE INDEX "SaleProduct_normalizedName_key" ON "SaleProduct"("normalizedName");
CREATE UNIQUE INDEX "Sale_operationId_key" ON "Sale"("operationId");
CREATE INDEX "SaleProduct_isActive_name_idx" ON "SaleProduct"("isActive", "name");
CREATE INDEX "SaleProduct_stockQuantity_idx" ON "SaleProduct"("stockQuantity");
CREATE INDEX "Sale_createdAt_status_idx" ON "Sale"("createdAt", "status");
CREATE INDEX "Sale_soldByUserId_createdAt_idx" ON "Sale"("soldByUserId", "createdAt");
CREATE INDEX "Sale_buyerStudentProfileId_invoiceYear_invoiceMonth_status_idx" ON "Sale"("buyerStudentProfileId", "invoiceYear", "invoiceMonth", "status");
CREATE INDEX "Sale_financialStudentId_invoiceYear_invoiceMonth_status_idx" ON "Sale"("financialStudentId", "invoiceYear", "invoiceMonth", "status");
CREATE INDEX "Sale_financialPaymentId_idx" ON "Sale"("financialPaymentId");
CREATE INDEX "Sale_unit_invoiceYear_invoiceMonth_status_idx" ON "Sale"("unit", "invoiceYear", "invoiceMonth", "status");
CREATE INDEX "Sale_invoiceYear_invoiceMonth_settlementType_status_idx" ON "Sale"("invoiceYear", "invoiceMonth", "settlementType", "status");
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");
CREATE INDEX "SaleItem_productId_createdAt_idx" ON "SaleItem"("productId", "createdAt");

ALTER TABLE "SaleProduct"
ADD CONSTRAINT "SaleProduct_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SaleProduct"
ADD CONSTRAINT "SaleProduct_updatedByUserId_fkey"
FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Sale"
ADD CONSTRAINT "Sale_buyerStudentProfileId_fkey"
FOREIGN KEY ("buyerStudentProfileId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Sale"
ADD CONSTRAINT "Sale_financialStudentId_fkey"
FOREIGN KEY ("financialStudentId") REFERENCES "FinancialStudent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Sale"
ADD CONSTRAINT "Sale_financialPaymentId_fkey"
FOREIGN KEY ("financialPaymentId") REFERENCES "FinancialPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Sale"
ADD CONSTRAINT "Sale_soldByUserId_fkey"
FOREIGN KEY ("soldByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Sale"
ADD CONSTRAINT "Sale_canceledByUserId_fkey"
FOREIGN KEY ("canceledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SaleItem"
ADD CONSTRAINT "SaleItem_saleId_fkey"
FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SaleItem"
ADD CONSTRAINT "SaleItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "SaleProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
