CREATE TYPE "StudentPreRegistrationStatus" AS ENUM ('PENDING', 'CONTACTED', 'APPROVED', 'REJECTED');

CREATE TABLE "StudentPreRegistration" (
  "id" TEXT NOT NULL,
  "status" "StudentPreRegistrationStatus" NOT NULL DEFAULT 'PENDING',
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "address" TEXT,
  "birthDate" TIMESTAMP(3),
  "studentPhone" TEXT,
  "secondaryContact" TEXT,
  "guardianDocument" TEXT,
  "guardianName" TEXT,
  "guardianPhone" TEXT,
  "notes" TEXT,
  "englishGoal" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentPreRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentPreRegistration_email_key" ON "StudentPreRegistration"("email");
CREATE INDEX "StudentPreRegistration_status_createdAt_idx" ON "StudentPreRegistration"("status", "createdAt");
CREATE INDEX "StudentPreRegistration_createdAt_idx" ON "StudentPreRegistration"("createdAt");
