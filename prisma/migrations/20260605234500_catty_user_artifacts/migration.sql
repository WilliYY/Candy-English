-- CreateEnum
CREATE TYPE "CattyUserArtifactStatus" AS ENUM ('ACTIVE', 'PENDING', 'DISABLED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "CattyUserArtifact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "emojis" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "catchphrases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sounds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "example" TEXT,
    "toneRule" TEXT,
    "status" "CattyUserArtifactStatus" NOT NULL DEFAULT 'PENDING',
    "blockedReason" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CattyUserArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CattyUserArtifact_userId_themeId_key" ON "CattyUserArtifact"("userId", "themeId");

-- CreateIndex
CREATE INDEX "CattyUserArtifact_userId_status_idx" ON "CattyUserArtifact"("userId", "status");

-- CreateIndex
CREATE INDEX "CattyUserArtifact_createdByUserId_idx" ON "CattyUserArtifact"("createdByUserId");

-- CreateIndex
CREATE INDEX "CattyUserArtifact_updatedByUserId_idx" ON "CattyUserArtifact"("updatedByUserId");

-- CreateIndex
CREATE INDEX "CattyUserArtifact_status_updatedAt_idx" ON "CattyUserArtifact"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "CattyUserArtifact" ADD CONSTRAINT "CattyUserArtifact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CattyUserArtifact" ADD CONSTRAINT "CattyUserArtifact_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CattyUserArtifact" ADD CONSTRAINT "CattyUserArtifact_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
