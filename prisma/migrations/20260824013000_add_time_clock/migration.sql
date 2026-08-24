-- CreateEnum
CREATE TYPE "TimeClockEntryType" AS ENUM ('ENTRY', 'EXIT');

-- CreateEnum
CREATE TYPE "TimeClockEntrySource" AS ENUM ('SELF', 'ADMIN');

-- CreateTable
CREATE TABLE "TimeClockProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeClockProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeClockEntry" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" "TimeClockEntryType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "justification" TEXT,
    "source" "TimeClockEntrySource" NOT NULL,
    "operationId" TEXT,
    "recordedByUserId" TEXT,
    "correctedAt" TIMESTAMP(3),
    "correctedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeClockEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeClockEntryRevision" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "previousType" "TimeClockEntryType" NOT NULL,
    "previousOccurredAt" TIMESTAMP(3) NOT NULL,
    "previousJustification" TEXT,
    "previousUpdatedAt" TIMESTAMP(3) NOT NULL,
    "correctionReason" TEXT NOT NULL,
    "changedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeClockEntryRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimeClockProfile_userId_key" ON "TimeClockProfile"("userId");

-- CreateIndex
CREATE INDEX "TimeClockProfile_isActive_idx" ON "TimeClockProfile"("isActive");

-- CreateIndex
CREATE INDEX "TimeClockProfile_createdByUserId_idx" ON "TimeClockProfile"("createdByUserId");

-- CreateIndex
CREATE INDEX "TimeClockProfile_updatedByUserId_idx" ON "TimeClockProfile"("updatedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeClockEntry_operationId_key" ON "TimeClockEntry"("operationId");

-- CreateIndex
CREATE INDEX "TimeClockEntry_profileId_occurredAt_idx" ON "TimeClockEntry"("profileId", "occurredAt");

-- CreateIndex
CREATE INDEX "TimeClockEntry_recordedByUserId_createdAt_idx" ON "TimeClockEntry"("recordedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "TimeClockEntry_correctedByUserId_correctedAt_idx" ON "TimeClockEntry"("correctedByUserId", "correctedAt");

-- CreateIndex
CREATE INDEX "TimeClockEntryRevision_entryId_createdAt_idx" ON "TimeClockEntryRevision"("entryId", "createdAt");

-- CreateIndex
CREATE INDEX "TimeClockEntryRevision_changedByUserId_createdAt_idx" ON "TimeClockEntryRevision"("changedByUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "TimeClockProfile" ADD CONSTRAINT "TimeClockProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeClockProfile" ADD CONSTRAINT "TimeClockProfile_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeClockProfile" ADD CONSTRAINT "TimeClockProfile_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeClockEntry" ADD CONSTRAINT "TimeClockEntry_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "TimeClockProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeClockEntry" ADD CONSTRAINT "TimeClockEntry_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeClockEntry" ADD CONSTRAINT "TimeClockEntry_correctedByUserId_fkey" FOREIGN KEY ("correctedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeClockEntryRevision" ADD CONSTRAINT "TimeClockEntryRevision_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "TimeClockEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeClockEntryRevision" ADD CONSTRAINT "TimeClockEntryRevision_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
