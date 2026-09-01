CREATE TABLE "UserMfa" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secretCiphertext" TEXT NOT NULL,
    "pendingExpiresAt" TIMESTAMP(3),
    "enabledAt" TIMESTAMP(3),
    "recoveryCodeHashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "lastUsedTimeStep" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMfa_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserMfa_userId_key" ON "UserMfa"("userId");
CREATE INDEX "UserMfa_enabledAt_idx" ON "UserMfa"("enabledAt");

ALTER TABLE "UserMfa"
ADD CONSTRAINT "UserMfa_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
