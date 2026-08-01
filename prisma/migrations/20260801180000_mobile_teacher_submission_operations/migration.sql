ALTER TABLE "HomeworkSubmission"
ADD COLUMN "lastMobileReviewOperationId" TEXT,
ADD COLUMN "lastMobileRedoOperationId" TEXT;

CREATE UNIQUE INDEX "HomeworkSubmission_lastMobileReviewOperationId_key"
ON "HomeworkSubmission"("lastMobileReviewOperationId");

CREATE UNIQUE INDEX "HomeworkSubmission_lastMobileRedoOperationId_key"
ON "HomeworkSubmission"("lastMobileRedoOperationId");
