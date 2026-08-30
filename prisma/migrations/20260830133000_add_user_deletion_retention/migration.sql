ALTER TABLE "User"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "scheduledAnonymizationAt" TIMESTAMP(3),
ADD COLUMN "anonymizedAt" TIMESTAMP(3),
ADD COLUMN "deletionReason" TEXT,
ADD COLUMN "deletedByName" TEXT;

CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
CREATE INDEX "User_scheduledAnonymizationAt_anonymizedAt_idx"
ON "User"("scheduledAnonymizationAt", "anonymizedAt");
