ALTER TYPE "StudentPreRegistrationStatus" ADD VALUE 'WAITING_PAYMENT';
ALTER TYPE "StudentPreRegistrationStatus" ADD VALUE 'READY_TO_CONVERT';

ALTER TABLE "StudentPreRegistration"
  ALTER COLUMN "email" DROP NOT NULL,
  ADD COLUMN "phoneNormalized" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "unit" "FinancialUnit" NOT NULL DEFAULT 'IVATE',
  ADD COLUMN "estimatedLevel" TEXT,
  ADD COLUMN "assignedTeacherProfileId" TEXT,
  ADD COLUMN "createdByUserId" TEXT,
  ADD COLUMN "intendedWeekdayMask" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "intendedTime" TEXT,
  ADD COLUMN "tuitionCents" INTEGER,
  ADD COLUMN "paymentDay" INTEGER,
  ADD COLUMN "paymentMethod" TEXT,
  ADD COLUMN "installmentsTotal" INTEGER;

CREATE UNIQUE INDEX "StudentPreRegistration_phoneNormalized_key" ON "StudentPreRegistration"("phoneNormalized");
CREATE INDEX "StudentPreRegistration_unit_status_createdAt_idx" ON "StudentPreRegistration"("unit", "status", "createdAt");
CREATE INDEX "StudentPreRegistration_assignedTeacherProfileId_status_createdAt_idx" ON "StudentPreRegistration"("assignedTeacherProfileId", "status", "createdAt");
CREATE INDEX "StudentPreRegistration_createdByUserId_status_createdAt_idx" ON "StudentPreRegistration"("createdByUserId", "status", "createdAt");

ALTER TABLE "StudentPreRegistration"
  ADD CONSTRAINT "StudentPreRegistration_assignedTeacherProfileId_fkey"
  FOREIGN KEY ("assignedTeacherProfileId") REFERENCES "TeacherProfile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudentPreRegistration"
  ADD CONSTRAINT "StudentPreRegistration_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
