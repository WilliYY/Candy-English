-- Add bounded Catty conversation history for authenticated AVA users.
CREATE TYPE "CattyMessageRole" AS ENUM ('USER', 'CATTY');
CREATE TYPE "CattyReplySource" AS ENUM ('GEMINI', 'OPENAI', 'FALLBACK');

CREATE TABLE "CattyConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "task" TEXT,
    "contextKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CattyConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CattyMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "CattyMessageRole" NOT NULL,
    "text" TEXT NOT NULL,
    "source" "CattyReplySource",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CattyMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CattyConversation_userId_contextKey_key" ON "CattyConversation"("userId", "contextKey");
CREATE INDEX "CattyConversation_userId_updatedAt_idx" ON "CattyConversation"("userId", "updatedAt");
CREATE INDEX "CattyMessage_conversationId_createdAt_idx" ON "CattyMessage"("conversationId", "createdAt");

ALTER TABLE "CattyConversation"
ADD CONSTRAINT "CattyConversation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CattyMessage"
ADD CONSTRAINT "CattyMessage_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "CattyConversation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
