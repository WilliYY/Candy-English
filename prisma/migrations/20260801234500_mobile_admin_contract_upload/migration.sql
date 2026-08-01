ALTER TABLE "ContractDocument"
ADD COLUMN "createdByMobileOperationId" TEXT;

CREATE UNIQUE INDEX "ContractDocument_createdByMobileOperationId_key"
ON "ContractDocument"("createdByMobileOperationId");
