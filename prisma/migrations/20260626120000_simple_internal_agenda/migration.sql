-- Store the internal agenda student's current recurrence summary without
-- touching historical lesson occurrences.
ALTER TABLE "AgendaStudent"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "defaultTime" TEXT,
  ADD COLUMN "weekdayMask" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "AgendaStudent_isActive_name_idx" ON "AgendaStudent"("isActive", "name");
