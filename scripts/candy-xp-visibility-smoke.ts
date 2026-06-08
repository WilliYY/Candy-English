import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const titlePrefix = `Codex Candy XP Visibility ${runId}`;
const studentEmails = [
  `codex-candy-xp-a-${runId}@example.com`,
  `codex-candy-xp-b-${runId}@example.com`,
];

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL precisa estar definido para candy-xp visibility smoke.",
  );
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function cleanup() {
  await prisma.candyXpActivity.deleteMany({
    where: {
      title: {
        startsWith: titlePrefix,
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      email: {
        in: studentEmails,
      },
    },
  });
}

async function createStudent(index: number) {
  return prisma.user.create({
    data: {
      email:
        studentEmails[index] ?? `codex-candy-xp-${index}-${runId}@example.com`,
      isActive: true,
      name: `Codex Candy XP Student ${index + 1}`,
      passwordHash: "not-used-in-smoke",
      role: "STUDENT",
      studentProfile: {
        create: {
          level: "Smoke",
          notes: "Perfil temporario do smoke de visibilidade Candy XP.",
        },
      },
    },
    select: {
      studentProfile: {
        select: {
          id: true,
        },
      },
    },
  });
}

async function visibleActivityTitles(studentProfileId: string) {
  const activities = await prisma.candyXpActivity.findMany({
    where: {
      OR: [
        {
          assignments: {
            none: {},
          },
        },
        {
          assignments: {
            some: {
              studentProfileId,
            },
          },
        },
      ],
      status: "PUBLISHED",
      title: {
        startsWith: titlePrefix,
      },
    },
    orderBy: {
      title: "asc",
    },
    select: {
      title: true,
    },
  });

  return activities.map((activity) => activity.title);
}

function assertVisible(label: string, titles: string[], expected: string[]) {
  const missing = expected.filter((title) => !titles.includes(title));
  const unexpected = titles.filter((title) => !expected.includes(title));

  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `${label}: esperado [${expected.join(", ")}], recebeu [${titles.join(", ")}].`,
    );
  }

  console.log(`OK ${label}: ${titles.join(", ")}`);
}

async function main() {
  await cleanup();

  const firstStudent = await createStudent(0);
  const secondStudent = await createStudent(1);
  const firstStudentProfileId = firstStudent.studentProfile?.id;
  const secondStudentProfileId = secondStudent.studentProfile?.id;

  if (!firstStudentProfileId || !secondStudentProfileId) {
    throw new Error("Nao foi possivel criar perfis student para o smoke.");
  }

  const allStudentsTitle = `${titlePrefix} - todos`;
  const firstOnlyTitle = `${titlePrefix} - individual`;
  const draftTitle = `${titlePrefix} - rascunho`;
  const archivedTitle = `${titlePrefix} - arquivada`;

  await prisma.candyXpActivity.createMany({
    data: [
      {
        category: "Smoke",
        level: "A1",
        status: "PUBLISHED",
        title: allStudentsTitle,
        xpReward: 10,
        publishedAt: new Date(),
      },
      {
        category: "Smoke",
        level: "A1",
        status: "DRAFT",
        title: draftTitle,
        xpReward: 10,
      },
      {
        category: "Smoke",
        level: "A1",
        status: "ARCHIVED",
        title: archivedTitle,
        xpReward: 10,
      },
    ],
  });

  await prisma.candyXpActivity.create({
    data: {
      assignments: {
        create: {
          studentProfileId: firstStudentProfileId,
        },
      },
      category: "Smoke",
      level: "A1",
      publishedAt: new Date(),
      status: "PUBLISHED",
      title: firstOnlyTitle,
      xpReward: 10,
    },
  });

  const firstStudentTitles = await visibleActivityTitles(firstStudentProfileId);
  const secondStudentTitles = await visibleActivityTitles(
    secondStudentProfileId,
  );

  assertVisible("student com atividade individual", firstStudentTitles, [
    firstOnlyTitle,
    allStudentsTitle,
  ]);
  assertVisible("student sem atividade individual", secondStudentTitles, [
    allStudentsTitle,
  ]);

  console.log("Candy XP visibility smoke OK");
}

main()
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
    await pool.end();
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
