CREATE TABLE "CandyXpActivityInteractiveField" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
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

    CONSTRAINT "CandyXpActivityInteractiveField_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CandyXpActivityInteractiveField_activityId_sortOrder_idx" ON "CandyXpActivityInteractiveField"("activityId", "sortOrder");

ALTER TABLE "CandyXpActivityInteractiveField" ADD CONSTRAINT "CandyXpActivityInteractiveField_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "CandyXpActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
