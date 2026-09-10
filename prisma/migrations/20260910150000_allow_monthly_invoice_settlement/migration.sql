-- Expand only: monthly invoices can be pending or paid. No sale data is changed.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public."Sale" DROP CONSTRAINT "Sale_settlement_check";
ALTER TABLE public."Sale" ADD CONSTRAINT "Sale_settlement_check" CHECK (
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
  )
);
COMMIT;
