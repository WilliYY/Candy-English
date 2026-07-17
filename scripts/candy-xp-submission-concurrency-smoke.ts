import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  Prisma,
  PrismaClient,
  type CandyXpSubmissionStatus,
} from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const titlePrefix = `Codex Candy XP Concurrency ${runId}`;
const adminEmail = `codex-candy-xp-concurrency-admin-${runId}@example.com`;
const studentEmail = `codex-candy-xp-concurrency-student-${runId}@example.com`;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL precisa estar definido para candy-xp concurrency smoke.",
  );
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const editableStatuses: CandyXpSubmissionStatus[] = ["DRAFT", "RETURNED"];

type Answer = {
  questionId: string;
  value: string;
};

type AwardInput = {
  activityId: string;
  studentUserId: string;
  submissionId: string;
  xpReward: number;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

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
        in: [adminEmail, studentEmail],
      },
    },
  });
}

async function lockSubmission(
  tx: Prisma.TransactionClient,
  activityId: string,
  studentProfileId: string,
) {
  const lockKey = `candy-xp-submission:${activityId}:${studentProfileId}`;

  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0::bigint))
  `;
}

async function awardInTransaction(
  tx: Prisma.TransactionClient,
  input: AwardInput,
) {
  const sourceKey = `student:candy-xp-activity:${input.submissionId}`;
  const xpEvent = await tx.candyXpEvent.upsert({
    where: {
      userId_sourceKey: {
        sourceKey,
        userId: input.studentUserId,
      },
    },
    create: {
      kind: "CANDY_XP_ACTIVITY_COMPLETED",
      metadata: {
        activityId: input.activityId,
        submissionId: input.submissionId,
      },
      role: "STUDENT",
      sourceKey,
      sourceLabel: "Candy XP",
      userId: input.studentUserId,
      xp: input.xpReward,
    },
    update: {
      xp: input.xpReward,
    },
    select: {
      id: true,
    },
  });

  await tx.candyXpActivitySubmission.update({
    where: {
      id: input.submissionId,
    },
    data: {
      awardedXp: input.xpReward,
      xpEventId: xpEvent.id,
    },
  });
}

async function autosave(input: {
  activityId: string;
  answers: Answer[];
  studentProfileId: string;
}) {
  return prisma.$transaction(async (tx) => {
    await lockSubmission(tx, input.activityId, input.studentProfileId);

    const existing = await tx.candyXpActivitySubmission.findUnique({
      where: {
        activityId_studentProfileId: {
          activityId: input.activityId,
          studentProfileId: input.studentProfileId,
        },
      },
      select: {
        awardedXp: true,
        id: true,
        status: true,
        xpEventId: true,
      },
    });

    if (
      existing &&
      (existing.status === "SUBMITTED" ||
        existing.status === "REVIEWED" ||
        existing.awardedXp !== null ||
        existing.xpEventId !== null)
    ) {
      return false;
    }

    if (!existing) {
      await tx.candyXpActivitySubmission.create({
        data: {
          activityId: input.activityId,
          answers: input.answers,
          status: "DRAFT",
          studentProfileId: input.studentProfileId,
        },
      });
      return true;
    }

    const updateResult = await tx.candyXpActivitySubmission.updateMany({
      where: {
        awardedXp: null,
        id: existing.id,
        status: {
          in: editableStatuses,
        },
        xpEventId: null,
      },
      data: {
        answers: input.answers,
        feedback: null,
        status: "DRAFT",
      },
    });

    return updateResult.count === 1;
  });
}

async function review(input: {
  adminUserId: string;
  outcome: "APPROVE" | "RETURN";
  submissionId: string;
}) {
  const locator = await prisma.candyXpActivitySubmission.findUniqueOrThrow({
    where: {
      id: input.submissionId,
    },
    select: {
      activityId: true,
      studentProfileId: true,
    },
  });

  return prisma.$transaction(async (tx) => {
    await lockSubmission(tx, locator.activityId, locator.studentProfileId);

    const submission = await tx.candyXpActivitySubmission.findUniqueOrThrow({
      where: {
        id: input.submissionId,
      },
      select: {
        activity: {
          select: {
            id: true,
            xpReward: true,
          },
        },
        awardedXp: true,
        id: true,
        status: true,
        studentProfile: {
          select: {
            userId: true,
          },
        },
        xpEventId: true,
      },
    });

    if (submission.status !== "SUBMITTED") {
      return false;
    }

    const isApproved = input.outcome === "APPROVE";

    if (
      !isApproved &&
      (submission.awardedXp !== null || submission.xpEventId !== null)
    ) {
      return false;
    }

    const updateResult = await tx.candyXpActivitySubmission.updateMany({
      where: {
        id: submission.id,
        status: "SUBMITTED",
        ...(!isApproved ? { awardedXp: null, xpEventId: null } : {}),
      },
      data: {
        feedback: isApproved ? "Aprovado no smoke." : "Devolvido no smoke.",
        reviewedAt: new Date(),
        reviewedByUserId: input.adminUserId,
        status: isApproved ? "REVIEWED" : "RETURNED",
      },
    });

    if (updateResult.count !== 1) {
      return false;
    }

    if (isApproved) {
      await awardInTransaction(tx, {
        activityId: submission.activity.id,
        studentUserId: submission.studentProfile.userId,
        submissionId: submission.id,
        xpReward: submission.activity.xpReward,
      });
    }

    return true;
  });
}

async function createActivity(title: string, xpReward = 37) {
  return prisma.candyXpActivity.create({
    data: {
      category: "Smoke",
      level: "A1",
      status: "PUBLISHED",
      title: `${titlePrefix} - ${title}`,
      xpReward,
    },
    select: {
      id: true,
      xpReward: true,
    },
  });
}

async function main() {
  await cleanup();

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      isActive: true,
      name: "Codex Candy XP Concurrency Admin",
      passwordHash: "not-used-in-smoke",
      role: "ADMIN",
    },
    select: {
      id: true,
    },
  });
  const student = await prisma.user.create({
    data: {
      email: studentEmail,
      isActive: true,
      name: "Codex Candy XP Concurrency Student",
      passwordHash: "not-used-in-smoke",
      role: "STUDENT",
      studentProfile: {
        create: {
          level: "Smoke",
          notes: "Perfil temporario do smoke de concorrencia Candy XP.",
        },
      },
    },
    select: {
      id: true,
      studentProfile: {
        select: {
          id: true,
        },
      },
    },
  });
  const studentProfileId = student.studentProfile?.id;

  assert(studentProfileId, "Nao foi possivel criar o perfil student do smoke.");

  const completionActivity = await createActivity("autosave versus conclusao");
  const completionSubmission =
    await prisma.candyXpActivitySubmission.create({
      data: {
        activityId: completionActivity.id,
        answers: [{ questionId: "field", value: "rascunho antigo" }],
        status: "DRAFT",
        studentProfileId,
      },
      select: {
        id: true,
      },
    });
  const lockHeld = deferred();
  const releaseCompletion = deferred();
  const completionPromise = prisma.$transaction(async (tx) => {
    await lockSubmission(tx, completionActivity.id, studentProfileId);
    await tx.candyXpActivitySubmission.update({
      where: {
        id: completionSubmission.id,
      },
      data: {
        answers: [{ questionId: "field", value: "resposta final" }],
        feedback: "Concluido no smoke.",
        reviewedAt: new Date(),
        status: "REVIEWED",
        submittedAt: new Date(),
      },
    });
    await awardInTransaction(tx, {
      activityId: completionActivity.id,
      studentUserId: student.id,
      submissionId: completionSubmission.id,
      xpReward: completionActivity.xpReward,
    });
    lockHeld.resolve();
    await releaseCompletion.promise;
  });

  await lockHeld.promise;
  let autosaveSettled = false;
  const lateAutosavePromise = autosave({
    activityId: completionActivity.id,
    answers: [{ questionId: "field", value: "autosave atrasado" }],
    studentProfileId,
  }).finally(() => {
    autosaveSettled = true;
  });

  await new Promise((resolve) => setTimeout(resolve, 100));
  const autosaveWaitedForLock = !autosaveSettled;
  releaseCompletion.resolve();
  const [, lateAutosaveSaved] = await Promise.all([
    completionPromise,
    lateAutosavePromise,
  ]);
  const completedSubmission =
    await prisma.candyXpActivitySubmission.findUniqueOrThrow({
      where: {
        id: completionSubmission.id,
      },
    });

  assert(autosaveWaitedForLock, "O autosave nao aguardou o lock da conclusao.");
  assert(!lateAutosaveSaved, "Autosave atrasado alterou submissao concluida.");
  assert(completedSubmission.status === "REVIEWED", "Status REVIEWED foi perdido.");
  assert(
    JSON.stringify(completedSubmission.answers).includes("resposta final"),
    "Autosave atrasado sobrescreveu as respostas finais.",
  );
  assert(
    completedSubmission.feedback === "Concluido no smoke.",
    "Autosave atrasado sobrescreveu o feedback final.",
  );

  const reviewActivity = await createActivity("revisoes opostas");
  const reviewSubmission = await prisma.candyXpActivitySubmission.create({
    data: {
      activityId: reviewActivity.id,
      answers: [{ questionId: "question", value: "answer" }],
      status: "SUBMITTED",
      studentProfileId,
      submittedAt: new Date(),
    },
    select: {
      id: true,
    },
  });
  const reviewResults = await Promise.all([
    review({
      adminUserId: admin.id,
      outcome: "APPROVE",
      submissionId: reviewSubmission.id,
    }),
    review({
      adminUserId: admin.id,
      outcome: "RETURN",
      submissionId: reviewSubmission.id,
    }),
  ]);
  const reviewedSubmission =
    await prisma.candyXpActivitySubmission.findUniqueOrThrow({
      where: {
        id: reviewSubmission.id,
      },
    });
  const reviewEventCount = await prisma.candyXpEvent.count({
    where: {
      sourceKey: `student:candy-xp-activity:${reviewSubmission.id}`,
      userId: student.id,
    },
  });

  assert(
    reviewResults.filter(Boolean).length === 1,
    "Mais de uma revisao concorrente foi aplicada.",
  );
  assert(
    reviewedSubmission.status === "REVIEWED" ||
      reviewedSubmission.status === "RETURNED",
    "A revisao concorrente terminou em status invalido.",
  );

  if (reviewedSubmission.status === "REVIEWED") {
    assert(
      reviewedSubmission.awardedXp === reviewActivity.xpReward &&
        reviewedSubmission.xpEventId !== null &&
        reviewEventCount === 1,
      "Aprovacao ficou sem XP atomico.",
    );
  } else {
    assert(
      reviewedSubmission.awardedXp === null &&
        reviewedSubmission.xpEventId === null &&
        reviewEventCount === 0,
      "Devolucao ficou contraditoria com XP.",
    );
  }

  const editableActivity = await createActivity("draft e returned");
  const draftSaved = await autosave({
    activityId: editableActivity.id,
    answers: [{ questionId: "field", value: "draft salvo" }],
    studentProfileId,
  });
  assert(draftSaved, "Autosave nao criou DRAFT.");
  await prisma.candyXpActivitySubmission.update({
    where: {
      activityId_studentProfileId: {
        activityId: editableActivity.id,
        studentProfileId,
      },
    },
    data: {
      feedback: "Refaca.",
      status: "RETURNED",
    },
  });
  const returnedSaved = await autosave({
    activityId: editableActivity.id,
    answers: [{ questionId: "field", value: "returned salvo" }],
    studentProfileId,
  });
  const editableSubmission =
    await prisma.candyXpActivitySubmission.findUniqueOrThrow({
      where: {
        activityId_studentProfileId: {
          activityId: editableActivity.id,
          studentProfileId,
        },
      },
    });

  assert(returnedSaved, "Autosave nao aceitou RETURNED.");
  assert(
    editableSubmission.status === "DRAFT" && editableSubmission.feedback === null,
    "RETURNED nao voltou ao fluxo editavel DRAFT.",
  );

  console.log("Candy XP submission concurrency smoke OK");
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
