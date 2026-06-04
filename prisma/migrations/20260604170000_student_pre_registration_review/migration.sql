-- Add review/conversion metadata for student pre-registration requests.
ALTER TABLE "StudentPreRegistration"
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedByUserId" TEXT,
ADD COLUMN "convertedUserId" TEXT,
ADD COLUMN "statusNote" TEXT;

CREATE UNIQUE INDEX "StudentPreRegistration_convertedUserId_key" ON "StudentPreRegistration"("convertedUserId");
CREATE INDEX "StudentPreRegistration_reviewedByUserId_idx" ON "StudentPreRegistration"("reviewedByUserId");
CREATE INDEX "StudentPreRegistration_convertedUserId_idx" ON "StudentPreRegistration"("convertedUserId");

ALTER TABLE "StudentPreRegistration"
ADD CONSTRAINT "StudentPreRegistration_reviewedByUserId_fkey"
FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudentPreRegistration"
ADD CONSTRAINT "StudentPreRegistration_convertedUserId_fkey"
FOREIGN KEY ("convertedUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
