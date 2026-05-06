-- FASE 11-13: AVA shell, live classes, profile and contract documents.

ALTER TABLE "User"
ADD COLUMN "address" TEXT,
ADD COLUMN "avatarMimeType" TEXT,
ADD COLUMN "avatarPath" TEXT,
ADD COLUMN "phone" TEXT;

CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "meetUrl" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isLive" BOOLEAN NOT NULL DEFAULT true,
    "teacherProfileId" TEXT NOT NULL,
    "studentProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContractDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "studentProfileId" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LiveSession_teacherProfileId_idx" ON "LiveSession"("teacherProfileId");
CREATE INDEX "LiveSession_studentProfileId_idx" ON "LiveSession"("studentProfileId");
CREATE INDEX "LiveSession_isLive_idx" ON "LiveSession"("isLive");
CREATE INDEX "ContractDocument_studentProfileId_idx" ON "ContractDocument"("studentProfileId");
CREATE INDEX "ContractDocument_uploadedByUserId_idx" ON "ContractDocument"("uploadedByUserId");

ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_teacherProfileId_fkey" FOREIGN KEY ("teacherProfileId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SitePageContent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ctaLabel" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SitePageContent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SitePageContent_slug_key" ON "SitePageContent"("slug");
