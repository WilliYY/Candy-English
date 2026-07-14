ALTER TABLE "AgendaStudent"
  ADD COLUMN "unit" "FinancialUnit" NOT NULL DEFAULT 'IVATE';

ALTER TABLE "StudentPreRegistration"
  ADD COLUMN "convertedStudentProfileId" TEXT,
  ADD COLUMN "convertedFinancialStudentId" TEXT,
  ADD COLUMN "convertedAgendaStudentId" TEXT;

CREATE UNIQUE INDEX "StudentPreRegistration_convertedStudentProfileId_key"
  ON "StudentPreRegistration"("convertedStudentProfileId");

CREATE UNIQUE INDEX "StudentPreRegistration_convertedFinancialStudentId_key"
  ON "StudentPreRegistration"("convertedFinancialStudentId");

CREATE UNIQUE INDEX "StudentPreRegistration_convertedAgendaStudentId_key"
  ON "StudentPreRegistration"("convertedAgendaStudentId");

CREATE INDEX "StudentPreRegistration_convertedStudentProfileId_idx"
  ON "StudentPreRegistration"("convertedStudentProfileId");

CREATE INDEX "StudentPreRegistration_convertedFinancialStudentId_idx"
  ON "StudentPreRegistration"("convertedFinancialStudentId");

CREATE INDEX "StudentPreRegistration_convertedAgendaStudentId_idx"
  ON "StudentPreRegistration"("convertedAgendaStudentId");

CREATE INDEX "AgendaStudent_unit_isActive_name_idx"
  ON "AgendaStudent"("unit", "isActive", "name");

ALTER TABLE "StudentPreRegistration"
  ADD CONSTRAINT "StudentPreRegistration_convertedStudentProfileId_fkey"
  FOREIGN KEY ("convertedStudentProfileId") REFERENCES "StudentProfile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudentPreRegistration"
  ADD CONSTRAINT "StudentPreRegistration_convertedFinancialStudentId_fkey"
  FOREIGN KEY ("convertedFinancialStudentId") REFERENCES "FinancialStudent"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudentPreRegistration"
  ADD CONSTRAINT "StudentPreRegistration_convertedAgendaStudentId_fkey"
  FOREIGN KEY ("convertedAgendaStudentId") REFERENCES "AgendaStudent"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
