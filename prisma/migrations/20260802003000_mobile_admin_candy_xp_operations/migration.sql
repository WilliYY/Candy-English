CREATE TABLE "MobileAdminCandyXpOperation" (
    "operationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "payloadDigest" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileAdminCandyXpOperation_pkey" PRIMARY KEY ("operationId")
);

CREATE INDEX "MobileAdminCandyXpOperation_targetId_kind_idx"
ON "MobileAdminCandyXpOperation"("targetId", "kind");

CREATE INDEX "MobileAdminCandyXpOperation_actorUserId_idx"
ON "MobileAdminCandyXpOperation"("actorUserId");

CREATE INDEX "MobileAdminCandyXpOperation_createdAt_idx"
ON "MobileAdminCandyXpOperation"("createdAt");
