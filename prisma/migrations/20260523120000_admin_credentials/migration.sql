CREATE TYPE "AdminCredentialKind" AS ENUM ('API_KEY', 'PASSWORD', 'TOKEN', 'CONFIG', 'URL', 'OTHER');

CREATE TYPE "AdminCredentialSource" AS ENUM ('MANUAL', 'ENV');

CREATE TABLE "AdminCredential" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "service" TEXT NOT NULL,
  "kind" "AdminCredentialKind" NOT NULL DEFAULT 'API_KEY',
  "username" TEXT,
  "url" TEXT,
  "notes" TEXT,
  "secretCiphertext" TEXT NOT NULL,
  "secretDigest" TEXT NOT NULL,
  "secretPreview" TEXT NOT NULL,
  "source" "AdminCredentialSource" NOT NULL DEFAULT 'MANUAL',
  "sourceKey" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AdminCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminCredential_sourceKey_key" ON "AdminCredential"("sourceKey");
CREATE INDEX "AdminCredential_service_idx" ON "AdminCredential"("service");
CREATE INDEX "AdminCredential_kind_idx" ON "AdminCredential"("kind");
CREATE INDEX "AdminCredential_source_idx" ON "AdminCredential"("source");
CREATE INDEX "AdminCredential_createdAt_idx" ON "AdminCredential"("createdAt");

ALTER TABLE "AdminCredential"
  ADD CONSTRAINT "AdminCredential_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdminCredential"
  ADD CONSTRAINT "AdminCredential_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
