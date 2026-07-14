ALTER TABLE "AgendaStudent"
  ADD COLUMN IF NOT EXISTS "unit" "FinancialUnit" NOT NULL DEFAULT 'IVATE';

CREATE INDEX IF NOT EXISTS "AgendaStudent_unit_isActive_name_idx"
  ON "AgendaStudent"("unit", "isActive", "name");
