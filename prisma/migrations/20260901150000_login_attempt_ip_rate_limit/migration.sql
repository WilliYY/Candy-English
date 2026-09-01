-- Store only a keyed fingerprint of the client IP, never the raw address.
ALTER TABLE "LoginAttempt" ADD COLUMN "ipHash" TEXT;

CREATE INDEX "LoginAttempt_ipHash_createdAt_idx"
ON "LoginAttempt"("ipHash", "createdAt");
