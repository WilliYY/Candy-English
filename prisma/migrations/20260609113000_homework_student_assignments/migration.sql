CREATE TABLE "HomeworkStudentAssignment" (
    "id" TEXT NOT NULL,
    "homeworkId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "assignedByTeacherProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeworkStudentAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HomeworkStudentAssignment_homeworkId_studentProfileId_key" ON "HomeworkStudentAssignment"("homeworkId", "studentProfileId");

CREATE INDEX "HomeworkStudentAssignment_studentProfileId_idx" ON "HomeworkStudentAssignment"("studentProfileId");

CREATE INDEX "HomeworkStudentAssignment_assignedByTeacherProfileId_idx" ON "HomeworkStudentAssignment"("assignedByTeacherProfileId");

ALTER TABLE "HomeworkStudentAssignment" ADD CONSTRAINT "HomeworkStudentAssignment_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HomeworkStudentAssignment" ADD CONSTRAINT "HomeworkStudentAssignment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HomeworkStudentAssignment" ADD CONSTRAINT "HomeworkStudentAssignment_assignedByTeacherProfileId_fkey" FOREIGN KEY ("assignedByTeacherProfileId") REFERENCES "TeacherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
