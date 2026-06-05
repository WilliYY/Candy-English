-- CreateEnum
CREATE TYPE "CattyUserMemoryCategory" AS ENUM ('INTEREST', 'LEARNING_GOAL', 'DIFFICULTY', 'STYLE', 'FAVORITE_THEME', 'EMOJI_PREFERENCE', 'NOTE');

-- CreateEnum
CREATE TYPE "CattyUserMemorySource" AS ENUM ('USER_MESSAGE', 'TEACHER_NOTE', 'ADMIN_NOTE', 'CATTY_DETECTED');

-- CreateEnum
CREATE TYPE "CattyUserMemoryStatus" AS ENUM ('ACTIVE', 'PENDING', 'FLAGGED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "CattyUserMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "CattyUserMemoryCategory" NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 70,
    "source" "CattyUserMemorySource" NOT NULL DEFAULT 'CATTY_DETECTED',
    "status" "CattyUserMemoryStatus" NOT NULL DEFAULT 'PENDING',
    "flaggedReason" TEXT,
    "createdByUserId" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CattyUserMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CattyMemoryEvent" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT,
    "userId" TEXT NOT NULL,
    "category" "CattyUserMemoryCategory",
    "key" TEXT,
    "previousValue" TEXT,
    "nextValue" TEXT,
    "action" TEXT NOT NULL,
    "source" "CattyUserMemorySource" NOT NULL,
    "status" "CattyUserMemoryStatus",
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CattyMemoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CattyUserMemory_userId_category_key_key" ON "CattyUserMemory"("userId", "category", "key");

-- CreateIndex
CREATE INDEX "CattyUserMemory_userId_status_category_idx" ON "CattyUserMemory"("userId", "status", "category");

-- CreateIndex
CREATE INDEX "CattyUserMemory_createdByUserId_idx" ON "CattyUserMemory"("createdByUserId");

-- CreateIndex
CREATE INDEX "CattyUserMemory_status_updatedAt_idx" ON "CattyUserMemory"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "CattyMemoryEvent_userId_createdAt_idx" ON "CattyMemoryEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CattyMemoryEvent_memoryId_idx" ON "CattyMemoryEvent"("memoryId");

-- CreateIndex
CREATE INDEX "CattyMemoryEvent_createdByUserId_idx" ON "CattyMemoryEvent"("createdByUserId");

-- AddForeignKey
ALTER TABLE "CattyUserMemory" ADD CONSTRAINT "CattyUserMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CattyUserMemory" ADD CONSTRAINT "CattyUserMemory_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CattyMemoryEvent" ADD CONSTRAINT "CattyMemoryEvent_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "CattyUserMemory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CattyMemoryEvent" ADD CONSTRAINT "CattyMemoryEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CattyMemoryEvent" ADD CONSTRAINT "CattyMemoryEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
