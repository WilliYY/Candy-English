-- Approved additive routine; no recipients or activation embedded in migration.
BEGIN;
CREATE TABLE "CattyMorningRoutine" (
  "id" TEXT PRIMARY KEY,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "groupName" VARCHAR(100) NOT NULL,
  "groupHash" CHAR(64) NOT NULL,
  "groupCiphertext" TEXT NOT NULL,
  "authorizedByUserId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "lateDate" VARCHAR(10), "lateUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CattyMorningRoutine_singleton" CHECK ("id" = 'morning-interno'),
  CONSTRAINT "CattyMorningRoutine_late" CHECK (("lateDate" IS NULL) = ("lateUntil" IS NULL))
);
CREATE TABLE "CattyMorningRun" (
  "id" TEXT PRIMARY KEY,
  "routineId" TEXT NOT NULL,
  "dateKey" VARCHAR(10) NOT NULL,
  "status" "CattyWhatsappMessageStatus" NOT NULL DEFAULT 'PROCESSING',
  "routineVersion" TIMESTAMP(3) NOT NULL,
  "replyCiphertext" TEXT, "providerIdHash" CHAR(64), "errorCode" VARCHAR(40),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CattyMorningRun_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "CattyMorningRoutine"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CattyMorningRun_date" CHECK ("dateKey" ~ '^\d{4}-\d{2}-\d{2}$')
);
CREATE UNIQUE INDEX "CattyMorningRun_routineId_dateKey_key" ON "CattyMorningRun"("routineId", "dateKey");
CREATE INDEX "CattyMorningRun_createdAt_idx" ON "CattyMorningRun"("createdAt");
COMMIT;
