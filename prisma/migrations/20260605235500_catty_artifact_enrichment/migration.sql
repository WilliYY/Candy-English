-- CreateEnum
CREATE TYPE "CattyArtifactEnrichmentStatus" AS ENUM ('PENDING', 'READY_FOR_REVIEW', 'APPROVED', 'REJECTED', 'FAILED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "CattyArtifactEnrichmentCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'offline',
    "query" TEXT NOT NULL,
    "safeSummary" TEXT,
    "suggestedEmojis" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "suggestedSounds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "suggestedCatchphrases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "suggestedExamples" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "suggestedVocabulary" JSONB,
    "suggestedBalloons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "cautions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sources" JSONB,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CattyArtifactEnrichmentCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CattyArtifactEnrichment" (
    "id" TEXT NOT NULL,
    "status" "CattyArtifactEnrichmentStatus" NOT NULL DEFAULT 'PENDING',
    "targetUserId" TEXT,
    "artifactId" TEXT,
    "cacheId" TEXT,
    "themeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'offline',
    "query" TEXT,
    "safeSummary" TEXT,
    "suggestedEmojis" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "suggestedSounds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "suggestedCatchphrases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "suggestedExamples" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "suggestedVocabulary" JSONB,
    "suggestedBalloons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "cautions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sources" JSONB,
    "failureReason" TEXT,
    "createdByUserId" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CattyArtifactEnrichment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CattyArtifactEnrichmentCache_cacheKey_key" ON "CattyArtifactEnrichmentCache"("cacheKey");

-- CreateIndex
CREATE INDEX "CattyArtifactEnrichmentCache_themeId_idx" ON "CattyArtifactEnrichmentCache"("themeId");

-- CreateIndex
CREATE INDEX "CattyArtifactEnrichmentCache_updatedAt_idx" ON "CattyArtifactEnrichmentCache"("updatedAt");

-- CreateIndex
CREATE INDEX "CattyArtifactEnrichmentCache_expiresAt_idx" ON "CattyArtifactEnrichmentCache"("expiresAt");

-- CreateIndex
CREATE INDEX "CattyArtifactEnrichment_targetUserId_status_idx" ON "CattyArtifactEnrichment"("targetUserId", "status");

-- CreateIndex
CREATE INDEX "CattyArtifactEnrichment_themeId_status_idx" ON "CattyArtifactEnrichment"("themeId", "status");

-- CreateIndex
CREATE INDEX "CattyArtifactEnrichment_artifactId_idx" ON "CattyArtifactEnrichment"("artifactId");

-- CreateIndex
CREATE INDEX "CattyArtifactEnrichment_cacheId_idx" ON "CattyArtifactEnrichment"("cacheId");

-- CreateIndex
CREATE INDEX "CattyArtifactEnrichment_createdByUserId_idx" ON "CattyArtifactEnrichment"("createdByUserId");

-- CreateIndex
CREATE INDEX "CattyArtifactEnrichment_reviewedByUserId_idx" ON "CattyArtifactEnrichment"("reviewedByUserId");

-- CreateIndex
CREATE INDEX "CattyArtifactEnrichment_status_updatedAt_idx" ON "CattyArtifactEnrichment"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "CattyArtifactEnrichment" ADD CONSTRAINT "CattyArtifactEnrichment_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CattyArtifactEnrichment" ADD CONSTRAINT "CattyArtifactEnrichment_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "CattyUserArtifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CattyArtifactEnrichment" ADD CONSTRAINT "CattyArtifactEnrichment_cacheId_fkey" FOREIGN KEY ("cacheId") REFERENCES "CattyArtifactEnrichmentCache"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CattyArtifactEnrichment" ADD CONSTRAINT "CattyArtifactEnrichment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CattyArtifactEnrichment" ADD CONSTRAINT "CattyArtifactEnrichment_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
