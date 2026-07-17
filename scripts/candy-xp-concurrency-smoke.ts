import "dotenv/config";
import { hash } from "bcryptjs";
import { getPrisma } from "../src/lib/prisma";
import { getCandyXpRankingSnapshot } from "../src/lib/candy-xp-ranking";
import { recordCandyXpEventsForUser } from "../src/lib/candy-xp-persistence";

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const testEmail = `codex-xp-concurrency-${runId}@example.com`;
const twinEmail = `codex-xp-concurrency-twin-${runId}@example.com`;
const testEmails = [testEmail, twinEmail];
const prisma = getPrisma();

async function cleanup() {
  await prisma.loginAttempt.deleteMany({
    where: {
      email: {
        in: testEmails,
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      email: {
        in: testEmails,
      },
    },
  });
}

async function main() {
  await cleanup();

  const passwordHash = await hash(`CandyXp-${runId}`, 12);
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      isActive: true,
      name: "Codex XP Concurrent Tie",
      passwordHash,
      role: "STUDENT",
      studentProfile: {
        create: {
          level: "Teste",
        },
      },
    },
    select: {
      id: true,
    },
  });

  await recordCandyXpEventsForUser({
    events: [
      {
        kind: "PROFILE_READY",
        sourceKey: `smoke:init:${runId}`,
        sourceLabel: "Smoke inicial",
        xp: 5,
      },
    ],
    role: "STUDENT",
    userId: user.id,
  });

  const now = Date.now();
  await Promise.all([
    recordCandyXpEventsForUser({
      events: [
        {
          kind: "PROFILE_READY",
          occurredAt: new Date(now - 5_000),
          sourceKey: `smoke:mutable:${runId}`,
          sourceLabel: "Perfil preparado",
          xp: 150,
        },
      ],
      role: "STUDENT",
      userId: user.id,
    }),
    recordCandyXpEventsForUser({
      events: [
        {
          kind: "PROFILE_READY",
          occurredAt: new Date(now),
          sourceKey: `smoke:mutable:${runId}`,
          sourceLabel: "Perfil preparado",
          xp: 350,
        },
      ],
      role: "STUDENT",
      userId: user.id,
    }),
    ...Array.from({ length: 8 }, (_, index) =>
      recordCandyXpEventsForUser({
        events: [
          {
            kind: "MISSION_COMPLETED",
            sourceKey: `smoke:parallel:${runId}:${index}`,
            sourceLabel: "Missoes simultaneas",
            xp: 10 + index,
          },
        ],
        role: "STUDENT",
        userId: user.id,
      }),
    ),
    ...Array.from({ length: 6 }, () =>
      recordCandyXpEventsForUser({
        events: [
          {
            kind: "MISSION_COMPLETED",
            sourceKey: `smoke:duplicate:${runId}`,
            sourceLabel: "Missao repetida",
            xp: 40,
          },
        ],
        role: "STUDENT",
        userId: user.id,
      }),
    ),
  ]);

  const [aggregate, duplicateCount, mutableEvent, profile] = await Promise.all([
    prisma.candyXpEvent.aggregate({
      where: { userId: user.id },
      _sum: { xp: true },
    }),
    prisma.candyXpEvent.count({
      where: {
        sourceKey: `smoke:duplicate:${runId}`,
        userId: user.id,
      },
    }),
    prisma.candyXpEvent.findUnique({
      where: {
        userId_sourceKey: {
          sourceKey: `smoke:mutable:${runId}`,
          userId: user.id,
        },
      },
      select: { xp: true },
    }),
    prisma.candyXpProfile.findUniqueOrThrow({
      where: { userId: user.id },
    }),
  ]);
  const ledgerTotal = aggregate._sum.xp ?? 0;

  if (duplicateCount !== 1) {
    throw new Error(`SourceKey duplicada gerou ${duplicateCount} eventos.`);
  }

  if (mutableEvent?.xp !== 350) {
    throw new Error(
      `Atualizacao antiga venceu a mais nova: XP final ${mutableEvent?.xp ?? "ausente"}.`,
    );
  }

  if (profile.totalXp !== ledgerTotal) {
    throw new Error(
      `Cache XP (${profile.totalXp}) divergiu do ledger (${ledgerTotal}).`,
    );
  }

  const twin = await prisma.user.create({
    data: {
      email: twinEmail,
      isActive: true,
      name: "Codex XP Concurrent Tie",
      passwordHash,
      role: "STUDENT",
      candyXpProfile: {
        create: {
          lastActivityDate: profile.lastActivityDate,
          lastXpEventAt: profile.lastXpEventAt,
          level: profile.level,
          levelStartXp: profile.levelStartXp,
          longestStreakDays: profile.longestStreakDays,
          progressXp: profile.progressXp,
          requiredXp: profile.requiredXp,
          role: "STUDENT",
          streakDays: profile.streakDays,
          totalXp: profile.totalXp,
        },
      },
      studentProfile: {
        create: {
          level: "Teste",
        },
      },
    },
    select: { id: true },
  });
  const ranking = await getCandyXpRankingSnapshot({
    currentUserId: user.id,
    limit: 100,
  });
  const userEntry = ranking.topEntries.find((entry) => entry.userId === user.id);
  const twinEntry = ranking.topEntries.find((entry) => entry.userId === twin.id);

  if (!userEntry || !twinEntry || userEntry.position === twinEntry.position) {
    throw new Error("Ranking nao produziu posicoes distintas para o empate.");
  }

  const expectedFirstId = [user.id, twin.id].sort()[0];
  const actualFirstId =
    userEntry.position < twinEntry.position ? user.id : twin.id;

  if (actualFirstId !== expectedFirstId) {
    throw new Error("Desempate do ranking por userId ficou instavel.");
  }

  console.log(
    "OK Candy XP concurrent ledger, stale update, deduplication and ranking tie",
  );
}

main()
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
