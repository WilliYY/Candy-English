-- CreateEnum
CREATE TYPE "CattyLearningCategory" AS ENUM ('PERSONALITY_RULE', 'IDEAL_REPLY', 'BAD_REPLY', 'VOCABULARY', 'COMMON_QUESTION', 'HOMEWORK_EXAMPLE', 'TEACHER_GUIDANCE', 'STUDENT_GUIDANCE', 'CATTY_PHRASE', 'APPROVED_CORRECTION', 'CANDY_CONTEXT');

-- CreateEnum
CREATE TYPE "CattyLearningStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "CattyLearningItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "CattyLearningCategory" NOT NULL,
    "intent" TEXT,
    "userPrompt" TEXT,
    "badReply" TEXT,
    "idealReply" TEXT,
    "notes" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "CattyLearningStatus" NOT NULL DEFAULT 'PENDING',
    "createdByUserId" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CattyLearningItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CattyLearningFeedback" (
    "id" TEXT NOT NULL,
    "itemId" TEXT,
    "note" TEXT NOT NULL,
    "suggestedTitle" TEXT,
    "suggestedCategory" "CattyLearningCategory",
    "suggestedIntent" TEXT,
    "status" "CattyLearningStatus" NOT NULL DEFAULT 'PENDING',
    "createdByUserId" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CattyLearningFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CattyLearningItem_status_category_idx" ON "CattyLearningItem"("status", "category");

-- CreateIndex
CREATE INDEX "CattyLearningItem_intent_idx" ON "CattyLearningItem"("intent");

-- CreateIndex
CREATE INDEX "CattyLearningItem_createdByUserId_idx" ON "CattyLearningItem"("createdByUserId");

-- CreateIndex
CREATE INDEX "CattyLearningItem_approvedByUserId_idx" ON "CattyLearningItem"("approvedByUserId");

-- CreateIndex
CREATE INDEX "CattyLearningItem_createdAt_idx" ON "CattyLearningItem"("createdAt");

-- CreateIndex
CREATE INDEX "CattyLearningFeedback_status_createdAt_idx" ON "CattyLearningFeedback"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CattyLearningFeedback_itemId_idx" ON "CattyLearningFeedback"("itemId");

-- CreateIndex
CREATE INDEX "CattyLearningFeedback_createdByUserId_idx" ON "CattyLearningFeedback"("createdByUserId");

-- CreateIndex
CREATE INDEX "CattyLearningFeedback_reviewedByUserId_idx" ON "CattyLearningFeedback"("reviewedByUserId");

-- AddForeignKey
ALTER TABLE "CattyLearningItem" ADD CONSTRAINT "CattyLearningItem_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CattyLearningItem" ADD CONSTRAINT "CattyLearningItem_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CattyLearningFeedback" ADD CONSTRAINT "CattyLearningFeedback_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CattyLearningItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CattyLearningFeedback" ADD CONSTRAINT "CattyLearningFeedback_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CattyLearningFeedback" ADD CONSTRAINT "CattyLearningFeedback_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
