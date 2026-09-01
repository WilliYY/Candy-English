ALTER TABLE "AgendaStudent"
ADD COLUMN "studentProfileId" TEXT;

-- Conversions already store both IDs and are the safest source for the link.
UPDATE "AgendaStudent" AS agenda_student
SET "studentProfileId" = registration."convertedStudentProfileId"
FROM "StudentPreRegistration" AS registration
WHERE registration."convertedAgendaStudentId" = agenda_student."id"
  AND registration."convertedStudentProfileId" IS NOT NULL;

-- Link legacy rows by an exact phone only when both sides are unambiguous.
UPDATE "AgendaStudent" AS agenda_student
SET "studentProfileId" = profile."id"
FROM "StudentProfile" AS profile
JOIN "User" AS student_user ON student_user."id" = profile."userId"
WHERE agenda_student."studentProfileId" IS NULL
  AND agenda_student."phone" IS NOT NULL
  AND REGEXP_REPLACE(agenda_student."phone", '[^0-9]', '', 'g') <> ''
  AND profile."unit" = agenda_student."unit"
  AND REGEXP_REPLACE(agenda_student."phone", '[^0-9]', '', 'g') =
      REGEXP_REPLACE(COALESCE(profile."studentPhone", student_user."phone", ''), '[^0-9]', '', 'g')
  AND NOT EXISTS (
    SELECT 1
    FROM "AgendaStudent" AS linked_agenda_student
    WHERE linked_agenda_student."studentProfileId" = profile."id"
  )
  AND (
    SELECT COUNT(*)
    FROM "AgendaStudent" AS candidate
    WHERE candidate."unit" = agenda_student."unit"
      AND candidate."phone" IS NOT NULL
      AND REGEXP_REPLACE(candidate."phone", '[^0-9]', '', 'g') =
          REGEXP_REPLACE(agenda_student."phone", '[^0-9]', '', 'g')
  ) = 1;

-- If phone is unavailable, use name + unit only when both records are unique.
UPDATE "AgendaStudent" AS agenda_student
SET "studentProfileId" = profile."id"
FROM "StudentProfile" AS profile
JOIN "User" AS student_user ON student_user."id" = profile."userId"
WHERE agenda_student."studentProfileId" IS NULL
  AND profile."unit" = agenda_student."unit"
  AND LOWER(TRIM(agenda_student."name")) = LOWER(TRIM(student_user."name"))
  AND NOT EXISTS (
    SELECT 1
    FROM "AgendaStudent" AS linked_agenda_student
    WHERE linked_agenda_student."studentProfileId" = profile."id"
  )
  AND (
    SELECT COUNT(*)
    FROM "AgendaStudent" AS candidate
    WHERE candidate."unit" = agenda_student."unit"
      AND LOWER(TRIM(candidate."name")) = LOWER(TRIM(agenda_student."name"))
  ) = 1
  AND (
    SELECT COUNT(*)
    FROM "StudentProfile" AS candidate_profile
    JOIN "User" AS candidate_user ON candidate_user."id" = candidate_profile."userId"
    WHERE candidate_profile."unit" = profile."unit"
      AND LOWER(TRIM(candidate_user."name")) = LOWER(TRIM(student_user."name"))
  ) = 1;

CREATE UNIQUE INDEX "AgendaStudent_studentProfileId_key"
ON "AgendaStudent"("studentProfileId");

ALTER TABLE "AgendaStudent"
ADD CONSTRAINT "AgendaStudent_studentProfileId_fkey"
FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
