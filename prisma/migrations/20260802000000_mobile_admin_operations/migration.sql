CREATE TABLE "MobileAdminMaintenanceOperation" (
    "operationId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "expectedUpdatedAt" TIMESTAMP(3),
    "resultUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileAdminMaintenanceOperation_pkey" PRIMARY KEY ("operationId")
);

CREATE INDEX "MobileAdminMaintenanceOperation_actorUserId_idx"
ON "MobileAdminMaintenanceOperation"("actorUserId");

CREATE INDEX "MobileAdminMaintenanceOperation_createdAt_idx"
ON "MobileAdminMaintenanceOperation"("createdAt");
