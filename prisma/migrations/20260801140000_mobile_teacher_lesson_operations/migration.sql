-- AlterTable
ALTER TABLE "Lesson"
ADD COLUMN "createdByMobileOperationId" TEXT,
ADD COLUMN "lastMobileOperationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_createdByMobileOperationId_key"
ON "Lesson"("createdByMobileOperationId");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_lastMobileOperationId_key"
ON "Lesson"("lastMobileOperationId");
