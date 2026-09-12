-- Additive, isolated channel. No changes to existing AVA records or Miauby.
BEGIN;
CREATE TYPE "CattyWhatsappMessageStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SENDING', 'SENT', 'FAILED', 'UNCERTAIN', 'CANCELED');
CREATE TABLE "CattyWhatsappChannel" (
  "id" TEXT NOT NULL DEFAULT 'main', "paused" BOOLEAN NOT NULL DEFAULT true,
  "workerToken" TEXT, "workerLeaseUntil" TIMESTAMP(3), "lastWorkerAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CattyWhatsappChannel_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CattyWhatsappChannel_singleton" CHECK ("id" = 'main')
);
CREATE TABLE "CattyWhatsappContact" (
  "id" TEXT NOT NULL, "name" VARCHAR(100) NOT NULL, "phoneHash" CHAR(64) NOT NULL,
  "phoneCiphertext" TEXT NOT NULL, "phoneMask" VARCHAR(30) NOT NULL,
  "authorized" BOOLEAN NOT NULL DEFAULT false, "consentAt" TIMESTAMP(3) NOT NULL,
  "optedOutAt" TIMESTAMP(3), "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CattyWhatsappContact_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CattyWhatsappContact_consent" CHECK (NOT "authorized" OR "optedOutAt" IS NULL)
);
CREATE TABLE "CattyWhatsappMessage" (
  "id" TEXT NOT NULL, "eventKey" VARCHAR(100) NOT NULL, "contactId" TEXT NOT NULL,
  "manual" BOOLEAN NOT NULL DEFAULT false, "status" "CattyWhatsappMessageStatus" NOT NULL DEFAULT 'QUEUED',
  "inputCiphertext" TEXT, "replyCiphertext" TEXT, "providerIdHash" CHAR(64), "createdByUserId" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0, "errorCode" VARCHAR(40),
  "expiresAt" TIMESTAMP(3) NOT NULL, "contentExpiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CattyWhatsappMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CattyWhatsappMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CattyWhatsappContact"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CattyWhatsappMessage_attempts" CHECK ("attempts" >= 0 AND "attempts" <= 3)
);
CREATE TABLE "CattyWhatsappAudit" (
  "id" TEXT NOT NULL, "action" VARCHAR(40) NOT NULL, "actorUserId" TEXT, "contactId" TEXT, "messageId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CattyWhatsappAudit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CattyWhatsappContact_phoneHash_key" ON "CattyWhatsappContact"("phoneHash");
CREATE UNIQUE INDEX "CattyWhatsappMessage_eventKey_key" ON "CattyWhatsappMessage"("eventKey");
CREATE INDEX "CattyWhatsappMessage_status_createdAt_idx" ON "CattyWhatsappMessage"("status", "createdAt");
CREATE INDEX "CattyWhatsappMessage_contactId_createdAt_idx" ON "CattyWhatsappMessage"("contactId", "createdAt");
CREATE INDEX "CattyWhatsappMessage_contentExpiresAt_idx" ON "CattyWhatsappMessage"("contentExpiresAt");
CREATE INDEX "CattyWhatsappMessage_createdAt_idx" ON "CattyWhatsappMessage"("createdAt");
CREATE INDEX "CattyWhatsappAudit_createdAt_idx" ON "CattyWhatsappAudit"("createdAt");
INSERT INTO "CattyWhatsappChannel" ("id", "updatedAt") VALUES ('main', CURRENT_TIMESTAMP);
COMMIT;
