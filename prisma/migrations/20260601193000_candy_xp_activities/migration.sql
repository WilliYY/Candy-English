ALTER TYPE "CandyXpEventKind" ADD VALUE 'CANDY_XP_ACTIVITY_COMPLETED';

CREATE TYPE "CandyXpActivityStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TYPE "CandyXpQuestionType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'MULTIPLE_CHOICE', 'CHECKBOX', 'MATCHING');

CREATE TYPE "CandyXpSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RETURNED', 'REVIEWED');

CREATE TABLE "CandyXpActivity" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "level" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "xpReward" INTEGER NOT NULL,
  "status" "CandyXpActivityStatus" NOT NULL DEFAULT 'DRAFT',
  "assetFileName" TEXT,
  "assetStoragePath" TEXT,
  "assetMimeType" TEXT,
  "assetSizeBytes" INTEGER,
  "assetPageCount" INTEGER NOT NULL DEFAULT 1,
  "publishedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CandyXpActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandyXpActivityQuestion" (
  "id" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "type" "CandyXpQuestionType" NOT NULL,
  "prompt" TEXT NOT NULL,
  "options" JSONB,
  "correctAnswer" JSONB,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CandyXpActivityQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandyXpActivityAssignment" (
  "id" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "studentProfileId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CandyXpActivityAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandyXpActivitySubmission" (
  "id" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "studentProfileId" TEXT NOT NULL,
  "answers" JSONB NOT NULL,
  "status" "CandyXpSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
  "autoScorePercent" INTEGER,
  "feedback" TEXT,
  "awardedXp" INTEGER,
  "xpEventId" TEXT,
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CandyXpActivitySubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CandyXpActivity_status_category_idx" ON "CandyXpActivity"("status", "category");
CREATE INDEX "CandyXpActivity_level_idx" ON "CandyXpActivity"("level");
CREATE INDEX "CandyXpActivity_createdByUserId_idx" ON "CandyXpActivity"("createdByUserId");

CREATE INDEX "CandyXpActivityQuestion_activityId_sortOrder_idx" ON "CandyXpActivityQuestion"("activityId", "sortOrder");

CREATE UNIQUE INDEX "CandyXpActivityAssignment_activityId_studentProfileId_key" ON "CandyXpActivityAssignment"("activityId", "studentProfileId");
CREATE INDEX "CandyXpActivityAssignment_studentProfileId_idx" ON "CandyXpActivityAssignment"("studentProfileId");

CREATE UNIQUE INDEX "CandyXpActivitySubmission_activityId_studentProfileId_key" ON "CandyXpActivitySubmission"("activityId", "studentProfileId");
CREATE INDEX "CandyXpActivitySubmission_studentProfileId_status_idx" ON "CandyXpActivitySubmission"("studentProfileId", "status");
CREATE INDEX "CandyXpActivitySubmission_activityId_status_idx" ON "CandyXpActivitySubmission"("activityId", "status");
CREATE INDEX "CandyXpActivitySubmission_reviewedByUserId_idx" ON "CandyXpActivitySubmission"("reviewedByUserId");

ALTER TABLE "CandyXpActivity"
  ADD CONSTRAINT "CandyXpActivity_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CandyXpActivityQuestion"
  ADD CONSTRAINT "CandyXpActivityQuestion_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "CandyXpActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandyXpActivityAssignment"
  ADD CONSTRAINT "CandyXpActivityAssignment_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "CandyXpActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandyXpActivityAssignment"
  ADD CONSTRAINT "CandyXpActivityAssignment_studentProfileId_fkey"
  FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandyXpActivitySubmission"
  ADD CONSTRAINT "CandyXpActivitySubmission_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "CandyXpActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandyXpActivitySubmission"
  ADD CONSTRAINT "CandyXpActivitySubmission_studentProfileId_fkey"
  FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandyXpActivitySubmission"
  ADD CONSTRAINT "CandyXpActivitySubmission_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
