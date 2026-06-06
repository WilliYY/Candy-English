-- Add primary marker for the student's preferred Catty artifact.
ALTER TABLE "CattyUserArtifact"
ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "CattyUserArtifact_userId_isPrimary_idx"
ON "CattyUserArtifact"("userId", "isPrimary");
