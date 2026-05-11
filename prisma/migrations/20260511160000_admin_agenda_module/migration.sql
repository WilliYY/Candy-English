CREATE TYPE "AgendaLessonStatus" AS ENUM (
  'SCHEDULED',
  'ATTENDED',
  'MISSED',
  'MAKEUP_SCHEDULED',
  'MAKEUP_ATTENDED'
);

CREATE TABLE "AgendaStudent" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AgendaStudent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgendaLesson" (
  "id" TEXT NOT NULL,
  "year" INTEGER NOT NULL DEFAULT 2026,
  "month" INTEGER NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "weekday" INTEGER NOT NULL,
  "time" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isMakeup" BOOLEAN NOT NULL DEFAULT false,
  "makeupForLessonId" TEXT,
  "status" "AgendaLessonStatus" NOT NULL DEFAULT 'SCHEDULED',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AgendaLesson_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgendaLog" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "studentId" TEXT,
  "lessonId" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AgendaLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgendaStudent_name_idx" ON "AgendaStudent"("name");
CREATE INDEX "AgendaLesson_year_month_date_idx" ON "AgendaLesson"("year", "month", "date");
CREATE INDEX "AgendaLesson_studentId_year_month_idx" ON "AgendaLesson"("studentId", "year", "month");
CREATE INDEX "AgendaLesson_isActive_date_idx" ON "AgendaLesson"("isActive", "date");
CREATE INDEX "AgendaLesson_makeupForLessonId_idx" ON "AgendaLesson"("makeupForLessonId");
CREATE INDEX "AgendaLog_createdAt_idx" ON "AgendaLog"("createdAt");
CREATE INDEX "AgendaLog_studentId_idx" ON "AgendaLog"("studentId");

ALTER TABLE "AgendaLesson" ADD CONSTRAINT "AgendaLesson_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "AgendaStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgendaLesson" ADD CONSTRAINT "AgendaLesson_makeupForLessonId_fkey" FOREIGN KEY ("makeupForLessonId") REFERENCES "AgendaLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgendaLog" ADD CONSTRAINT "AgendaLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "AgendaStudent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgendaLog" ADD CONSTRAINT "AgendaLog_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "AgendaLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgendaLog" ADD CONSTRAINT "AgendaLog_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
