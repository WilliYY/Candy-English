ALTER TABLE "FinancialPayment" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "FinancialPayment" ADD COLUMN "snapshotName" TEXT;
ALTER TABLE "FinancialPayment" ADD COLUMN "snapshotAmountCents" INTEGER;
ALTER TABLE "FinancialPayment" ADD COLUMN "snapshotPaymentDay" INTEGER;
ALTER TABLE "FinancialPayment" ADD COLUMN "snapshotPaymentMethod" TEXT;
ALTER TABLE "FinancialPayment" ADD COLUMN "snapshotPhone" TEXT;
ALTER TABLE "FinancialPayment" ADD COLUMN "snapshotCpf" TEXT;
ALTER TABLE "FinancialPayment" ADD COLUMN "snapshotEmail" TEXT;
ALTER TABLE "FinancialPayment" ADD COLUMN "snapshotAddress" TEXT;

UPDATE "FinancialPayment" AS payment
SET
  "snapshotName" = student."name",
  "snapshotAmountCents" = student."amountCents",
  "snapshotPaymentDay" = student."paymentDay",
  "snapshotPaymentMethod" = student."paymentMethod",
  "snapshotPhone" = student."phone",
  "snapshotCpf" = student."cpf",
  "snapshotEmail" = student."email",
  "snapshotAddress" = student."address"
FROM "FinancialStudent" AS student
WHERE payment."studentId" = student."id";

INSERT INTO "FinancialPayment" (
  "id",
  "year",
  "month",
  "studentId",
  "isActive",
  "snapshotName",
  "snapshotAmountCents",
  "snapshotPaymentDay",
  "snapshotPaymentMethod",
  "snapshotPhone",
  "snapshotCpf",
  "snapshotEmail",
  "snapshotAddress",
  "isPaid",
  "paidAt",
  "note",
  "createdAt",
  "updatedAt"
)
SELECT
  'finpay_' || substr(md5(student."id" || '-' || month_series."month"::text), 1, 20),
  2026,
  month_series."month",
  student."id",
  true,
  student."name",
  student."amountCents",
  student."paymentDay",
  student."paymentMethod",
  student."phone",
  student."cpf",
  student."email",
  student."address",
  false,
  NULL,
  NULL,
  now(),
  now()
FROM "FinancialStudent" AS student
CROSS JOIN generate_series(1, 12) AS month_series("month")
WHERE NOT EXISTS (
  SELECT 1
  FROM "FinancialPayment" AS payment
  WHERE
    payment."studentId" = student."id"
    AND payment."year" = 2026
    AND payment."month" = month_series."month"
);

ALTER TABLE "FinancialPayment" ALTER COLUMN "snapshotName" SET NOT NULL;
ALTER TABLE "FinancialPayment" ALTER COLUMN "snapshotAmountCents" SET NOT NULL;
ALTER TABLE "FinancialPayment" ALTER COLUMN "snapshotPaymentDay" SET NOT NULL;
ALTER TABLE "FinancialPayment" ALTER COLUMN "snapshotPaymentMethod" SET NOT NULL;

CREATE INDEX "FinancialPayment_year_month_isActive_idx" ON "FinancialPayment"("year", "month", "isActive");
