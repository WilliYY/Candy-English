CREATE TABLE "SiteVisitCounter" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "total" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SiteVisitCounter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteVisitCounter_key_key" ON "SiteVisitCounter"("key");
CREATE INDEX "SiteVisitCounter_updatedAt_idx" ON "SiteVisitCounter"("updatedAt");
