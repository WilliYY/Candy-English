ALTER TABLE "Homework" ADD COLUMN "replicatedFromHomeworkId" TEXT;

CREATE INDEX "Homework_replicatedFromHomeworkId_idx" ON "Homework"("replicatedFromHomeworkId");

ALTER TABLE "Homework"
  ADD CONSTRAINT "Homework_replicatedFromHomeworkId_fkey"
  FOREIGN KEY ("replicatedFromHomeworkId")
  REFERENCES "Homework"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
