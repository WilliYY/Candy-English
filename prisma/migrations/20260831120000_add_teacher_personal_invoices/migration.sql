-- Link registered staff purchases to the buyer account without changing the
-- existing student invoice ledger.
ALTER TABLE "Sale" ADD COLUMN "buyerUserId" TEXT;

CREATE INDEX "Sale_buyerUserId_invoiceYear_invoiceMonth_status_paidAt_idx"
ON "Sale"("buyerUserId", "invoiceYear", "invoiceMonth", "status", "paidAt");

ALTER TABLE "Sale"
ADD CONSTRAINT "Sale_buyerUserId_fkey"
FOREIGN KEY ("buyerUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
