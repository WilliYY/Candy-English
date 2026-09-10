-- Manual emergency down path, NOT a Prisma migration and NOT needed for app rollback.
-- Refuses to roll back if any monthly invoice is paid; never erase payment dates.
-- After any manual schema rollback, reconcile Prisma migration history explicitly.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public."Sale" ADD CONSTRAINT "Sale_settlement_rollback_guard" CHECK (
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
);
ALTER TABLE public."Sale" DROP CONSTRAINT "Sale_settlement_check";
ALTER TABLE public."Sale" RENAME CONSTRAINT "Sale_settlement_rollback_guard" TO "Sale_settlement_check";
COMMIT;
