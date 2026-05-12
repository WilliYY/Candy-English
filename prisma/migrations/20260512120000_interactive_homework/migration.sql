CREATE TYPE "HomeworkKind" AS ENUM ('TEXT', 'INTERACTIVE');

CREATE TYPE "HomeworkFieldType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'CHECKBOX');

ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'RETURNED';

ALTER TABLE "Homework"
  ADD COLUMN "kind" "HomeworkKind" NOT NULL DEFAULT 'TEXT',
  ADD COLUMN "assetFileName" TEXT,
  ADD COLUMN "assetStoragePath" TEXT,
  ADD COLUMN "assetMimeType" TEXT,
  ADD COLUMN "assetSizeBytes" INTEGER,
  ADD COLUMN "assetPageCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "fieldDetectionSource" TEXT;

CREATE TABLE "HomeworkInteractiveField" (
  "id" TEXT NOT NULL,
  "homeworkId" TEXT NOT NULL,
  "type" "HomeworkFieldType" NOT NULL DEFAULT 'LONG_TEXT',
  "label" TEXT,
  "placeholder" TEXT,
  "page" INTEGER NOT NULL DEFAULT 1,
  "x" DOUBLE PRECISION NOT NULL,
  "y" DOUBLE PRECISION NOT NULL,
  "width" DOUBLE PRECISION NOT NULL,
  "height" DOUBLE PRECISION NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HomeworkInteractiveField_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Homework_kind_idx" ON "Homework"("kind");
CREATE INDEX "HomeworkInteractiveField_homeworkId_idx" ON "HomeworkInteractiveField"("homeworkId");

ALTER TABLE "HomeworkInteractiveField"
  ADD CONSTRAINT "HomeworkInteractiveField_homeworkId_fkey"
  FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;
