ALTER TABLE "Homework"
ADD COLUMN "createdByMobileOperationId" TEXT,
ADD COLUMN "lastMobileOperationId" TEXT;

CREATE UNIQUE INDEX "Homework_createdByMobileOperationId_key"
ON "Homework"("createdByMobileOperationId");

CREATE UNIQUE INDEX "Homework_lastMobileOperationId_key"
ON "Homework"("lastMobileOperationId");

CREATE TABLE "MobileTeacherHomeworkDeletion" (
  "operationId" TEXT NOT NULL,
  "teacherProfileId" TEXT NOT NULL,
  "homeworkId" TEXT NOT NULL,
  "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MobileTeacherHomeworkDeletion_pkey" PRIMARY KEY ("operationId")
);

CREATE INDEX "MobileTeacherHomeworkDeletion_teacherProfileId_homeworkId_idx"
ON "MobileTeacherHomeworkDeletion"("teacherProfileId", "homeworkId");

CREATE INDEX "MobileTeacherHomeworkDeletion_deletedAt_idx"
ON "MobileTeacherHomeworkDeletion"("deletedAt");

ALTER TABLE "MobileTeacherHomeworkDeletion"
ADD CONSTRAINT "MobileTeacherHomeworkDeletion_teacherProfileId_fkey"
FOREIGN KEY ("teacherProfileId") REFERENCES "TeacherProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
