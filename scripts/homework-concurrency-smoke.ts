import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { canSubmitInteractiveHomework } from "../src/lib/homework-submission-state";
import { acquireTransactionAdvisoryLock } from "../src/lib/postgres-advisory-lock";

const databaseUrl = process.env.DATABASE_URL;
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const teacherEmail = `codex-homework-concurrency-teacher-${runId}@example.com`;
const studentEmail = `codex-homework-concurrency-student-${runId}@example.com`;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL precisa estar definido para homework concurrency smoke.",
  );
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [teacherEmail, studentEmail],
      },
    },
  });
}

async function submit(
  homeworkId: string,
  studentProfileId: string,
  answer: string,
  synchronization?: {
    lockHeld: ReturnType<typeof deferred>;
    release: ReturnType<typeof deferred>;
  },
) {
  return prisma.$transaction(
    async (tx) => {
      await acquireTransactionAdvisoryLock(
        tx,
        `homework-submission:${homeworkId}:${studentProfileId}`,
      );

      synchronization?.lockHeld.resolve();

      if (synchronization) {
        await synchronization.release.promise;
      }

      const currentSubmission = await tx.homeworkSubmission.findUnique({
        where: {
          homeworkId_studentProfileId: {
            homeworkId,
            studentProfileId,
          },
        },
        select: {
          status: true,
        },
      });

      if (!canSubmitInteractiveHomework(currentSubmission?.status)) {
        return false;
      }

      await tx.homeworkSubmission.upsert({
        where: {
          homeworkId_studentProfileId: {
            homeworkId,
            studentProfileId,
          },
        },
        create: {
          answers: [{ fieldId: "field", value: answer }],
          homeworkId,
          status: "SUBMITTED",
          studentProfileId,
        },
        update: {
          answers: [{ fieldId: "field", value: answer }],
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
      });

      return true;
    },
    {
      timeout: 10_000,
    },
  );
}

async function main() {
  await cleanup();

  const teacher = await prisma.user.create({
    data: {
      email: teacherEmail,
      name: "Codex Homework Concurrency Teacher",
      passwordHash: "not-used-in-smoke",
      role: "TEACHER",
      teacherProfile: {
        create: {},
      },
    },
    select: {
      teacherProfile: {
        select: {
          id: true,
        },
      },
    },
  });
  const student = await prisma.user.create({
    data: {
      email: studentEmail,
      name: "Codex Homework Concurrency Student",
      passwordHash: "not-used-in-smoke",
      role: "STUDENT",
      studentProfile: {
        create: {},
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
  const teacherProfileId = teacher.teacherProfile?.id;
  const studentProfileId = student.studentProfile?.id;

  assert(teacherProfileId, "Teacher temporaria sem perfil.");
  assert(studentProfileId, "Student temporario sem perfil.");

  const lesson = await prisma.lesson.create({
    data: {
      studentProfileId,
      teacherProfileId,
      title: `Homework concurrency ${runId}`,
    },
    select: {
      id: true,
    },
  });
  const homework = await prisma.homework.create({
    data: {
      kind: "INTERACTIVE",
      lessonId: lesson.id,
      teacherProfileId,
      title: `Homework concurrency ${runId}`,
    },
    select: {
      id: true,
    },
  });

  await prisma.homeworkSubmission.create({
    data: {
      answers: [{ fieldId: "field", value: "rascunho" }],
      homeworkId: homework.id,
      status: "DRAFT",
      studentProfileId,
    },
  });

  const lockHeld = deferred();
  const release = deferred();
  const firstSubmit = submit(
    homework.id,
    studentProfileId,
    "primeira entrega",
    { lockHeld, release },
  );

  await lockHeld.promise;

  let secondSettled = false;
  const secondSubmit = submit(
    homework.id,
    studentProfileId,
    "segunda entrega",
  ).finally(() => {
    secondSettled = true;
  });

  await new Promise((resolve) => setTimeout(resolve, 100));
  assert(!secondSettled, "O segundo envio nao aguardou o lock da primeira entrega.");

  release.resolve();

  const results = await Promise.all([firstSubmit, secondSubmit]);
  const submission = await prisma.homeworkSubmission.findUniqueOrThrow({
    where: {
      homeworkId_studentProfileId: {
        homeworkId: homework.id,
        studentProfileId,
      },
    },
    select: {
      answers: true,
      status: true,
    },
  });

  assert(
    results.filter(Boolean).length === 1,
    "Mais de um envio concorrente foi aceito.",
  );
  assert(submission.status === "SUBMITTED", "Entrega nao ficou SUBMITTED.");
  assert(
    JSON.stringify(submission.answers).includes("primeira entrega"),
    "O segundo envio sobrescreveu a primeira entrega.",
  );
  assert(
    !JSON.stringify(submission.answers).includes("segunda entrega"),
    "A resposta concorrente tardia foi persistida.",
  );

  console.log("Homework concurrency smoke OK");
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
