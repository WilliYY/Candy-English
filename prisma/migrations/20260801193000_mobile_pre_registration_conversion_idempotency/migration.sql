ALTER TABLE "StudentPreRegistration"
ADD COLUMN "lastMobileConversionOperationId" TEXT;

CREATE UNIQUE INDEX "StudentPreRegistration_lastMobileConversionOperationId_key"
ON "StudentPreRegistration"("lastMobileConversionOperationId");
