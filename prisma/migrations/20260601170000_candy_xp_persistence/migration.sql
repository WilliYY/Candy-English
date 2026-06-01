CREATE TYPE "CandyXpEventKind" AS ENUM ('ADMIN_ROUTINE', 'BADGE_AWARDED', 'FEEDBACK_REVIEWED', 'HOMEWORK_SUBMITTED', 'LESSON_ACTIVITY_SUBMITTED', 'MISSION_COMPLETED', 'PROFILE_READY', 'STREAK_BONUS', 'TEACHER_ROUTINE');

CREATE TYPE "CandyMissionKind" AS ENUM ('ADMIN_ROUTINE', 'DAILY', 'FEEDBACK', 'GAME', 'HOMEWORK', 'LESSON', 'LISTENING', 'REVIEW', 'SPEAKING', 'VOCABULARY');

CREATE TABLE "CandyXpProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "totalXp" INTEGER NOT NULL DEFAULT 0,
  "level" INTEGER NOT NULL DEFAULT 1,
  "levelStartXp" INTEGER NOT NULL DEFAULT 0,
  "progressXp" INTEGER NOT NULL DEFAULT 0,
  "requiredXp" INTEGER NOT NULL DEFAULT 120,
  "streakDays" INTEGER NOT NULL DEFAULT 0,
  "longestStreakDays" INTEGER NOT NULL DEFAULT 0,
  "lastActivityDate" TIMESTAMP(3),
  "lastXpEventAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CandyXpProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandyXpEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "kind" "CandyXpEventKind" NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "sourceLabel" TEXT NOT NULL,
  "xp" INTEGER NOT NULL,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CandyXpEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandyBadgeDefinition" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "role" "Role",
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "icon" TEXT,
  "requiredLevel" INTEGER,
  "requiredEventKind" "CandyXpEventKind",
  "requiredEventCount" INTEGER,
  "requiredStreakDays" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CandyBadgeDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandyUserBadge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "badgeDefinitionId" TEXT NOT NULL,
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sourceEventId" TEXT,

  CONSTRAINT "CandyUserBadge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandyMission" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "role" "Role",
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "kind" "CandyMissionKind" NOT NULL,
  "xpReward" INTEGER NOT NULL,
  "targetCount" INTEGER NOT NULL DEFAULT 1,
  "repeatable" BOOLEAN NOT NULL DEFAULT false,
  "cooldownHours" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CandyMission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandyMissionAttempt" (
  "id" TEXT NOT NULL,
  "attemptKey" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "progressCount" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "xpEventId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CandyMissionAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CandyXpProfile_userId_key" ON "CandyXpProfile"("userId");
CREATE INDEX "CandyXpProfile_role_level_idx" ON "CandyXpProfile"("role", "level");
CREATE INDEX "CandyXpProfile_totalXp_idx" ON "CandyXpProfile"("totalXp");
CREATE INDEX "CandyXpProfile_lastXpEventAt_idx" ON "CandyXpProfile"("lastXpEventAt");

CREATE UNIQUE INDEX "CandyXpEvent_userId_sourceKey_key" ON "CandyXpEvent"("userId", "sourceKey");
CREATE INDEX "CandyXpEvent_userId_occurredAt_idx" ON "CandyXpEvent"("userId", "occurredAt");
CREATE INDEX "CandyXpEvent_role_kind_idx" ON "CandyXpEvent"("role", "kind");
CREATE INDEX "CandyXpEvent_sourceLabel_idx" ON "CandyXpEvent"("sourceLabel");

CREATE UNIQUE INDEX "CandyBadgeDefinition_key_key" ON "CandyBadgeDefinition"("key");
CREATE INDEX "CandyBadgeDefinition_role_isActive_idx" ON "CandyBadgeDefinition"("role", "isActive");
CREATE INDEX "CandyBadgeDefinition_requiredEventKind_idx" ON "CandyBadgeDefinition"("requiredEventKind");

CREATE UNIQUE INDEX "CandyUserBadge_userId_badgeDefinitionId_key" ON "CandyUserBadge"("userId", "badgeDefinitionId");
CREATE INDEX "CandyUserBadge_userId_earnedAt_idx" ON "CandyUserBadge"("userId", "earnedAt");
CREATE INDEX "CandyUserBadge_badgeDefinitionId_idx" ON "CandyUserBadge"("badgeDefinitionId");

CREATE UNIQUE INDEX "CandyMission_key_key" ON "CandyMission"("key");
CREATE INDEX "CandyMission_role_isActive_sortOrder_idx" ON "CandyMission"("role", "isActive", "sortOrder");
CREATE INDEX "CandyMission_kind_isActive_idx" ON "CandyMission"("kind", "isActive");

CREATE UNIQUE INDEX "CandyMissionAttempt_attemptKey_key" ON "CandyMissionAttempt"("attemptKey");
CREATE INDEX "CandyMissionAttempt_missionId_userId_idx" ON "CandyMissionAttempt"("missionId", "userId");
CREATE INDEX "CandyMissionAttempt_userId_completedAt_idx" ON "CandyMissionAttempt"("userId", "completedAt");

ALTER TABLE "CandyXpProfile"
  ADD CONSTRAINT "CandyXpProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandyXpEvent"
  ADD CONSTRAINT "CandyXpEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandyUserBadge"
  ADD CONSTRAINT "CandyUserBadge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandyUserBadge"
  ADD CONSTRAINT "CandyUserBadge_badgeDefinitionId_fkey"
  FOREIGN KEY ("badgeDefinitionId") REFERENCES "CandyBadgeDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandyMissionAttempt"
  ADD CONSTRAINT "CandyMissionAttempt_missionId_fkey"
  FOREIGN KEY ("missionId") REFERENCES "CandyMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandyMissionAttempt"
  ADD CONSTRAINT "CandyMissionAttempt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
