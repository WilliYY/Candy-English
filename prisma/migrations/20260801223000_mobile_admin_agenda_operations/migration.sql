ALTER TABLE "AgendaLesson"
ADD COLUMN "createdByMobileOperationId" TEXT,
ADD COLUMN "lastMobileOperationId" TEXT;

CREATE UNIQUE INDEX "AgendaLesson_createdByMobileOperationId_key"
ON "AgendaLesson"("createdByMobileOperationId");

CREATE UNIQUE INDEX "AgendaLesson_lastMobileOperationId_key"
ON "AgendaLesson"("lastMobileOperationId");
