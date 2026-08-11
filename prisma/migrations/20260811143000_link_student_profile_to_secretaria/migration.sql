-- Persist the student's operational unit in the AVA profile.
ALTER TABLE "StudentProfile"
ADD COLUMN "unit" "FinancialUnit" NOT NULL DEFAULT 'IVATE';

-- Converted students already have a trustworthy unit in their pre-registration.
UPDATE "StudentProfile" AS profile
SET "unit" = registration."unit"
FROM "StudentPreRegistration" AS registration
WHERE registration."convertedStudentProfileId" = profile."id";
