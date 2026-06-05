-- CreateEnum
CREATE TYPE "CattyLearningFeedbackKind" AS ENUM ('LIKED', 'DISLIKED', 'CONFUSING', 'SHOULD_ANSWER', 'PATTERN_SUGGESTION');

-- AlterTable
ALTER TABLE "CattyLearningFeedback"
ADD COLUMN "kind" "CattyLearningFeedbackKind" NOT NULL DEFAULT 'PATTERN_SUGGESTION',
ADD COLUMN "cattyMessageId" TEXT,
ADD COLUMN "userPrompt" TEXT,
ADD COLUMN "cattyReply" TEXT,
ADD COLUMN "idealReply" TEXT,
ADD COLUMN "contextArea" TEXT,
ADD COLUMN "contextTask" TEXT,
ADD COLUMN "contextKey" TEXT;

-- CreateIndex
CREATE INDEX "CattyLearningFeedback_kind_status_idx" ON "CattyLearningFeedback"("kind", "status");

-- CreateIndex
CREATE INDEX "CattyLearningFeedback_cattyMessageId_idx" ON "CattyLearningFeedback"("cattyMessageId");

-- CreateIndex
CREATE INDEX "CattyLearningFeedback_contextKey_idx" ON "CattyLearningFeedback"("contextKey");

-- AddForeignKey
ALTER TABLE "CattyLearningFeedback" ADD CONSTRAINT "CattyLearningFeedback_cattyMessageId_fkey" FOREIGN KEY ("cattyMessageId") REFERENCES "CattyMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
