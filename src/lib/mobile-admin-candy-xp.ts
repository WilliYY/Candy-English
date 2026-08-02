import { createHash } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import {
  awardCandyXpActivityInTransaction,
  readCandyXpSubmissionAnswers,
  refreshCandyXpActivityAward,
} from "@/lib/candy-xp-submission-service";
import type { CandyXpEventInput } from "@/lib/candy-xp-persistence";
import {
  getCandyXpRankingSnapshot,
  type CandyXpRankingSnapshot,
} from "@/lib/candy-xp-ranking";
import type { MobileAuthUser } from "@/lib/mobile-auth/contracts";
import { acquireTransactionAdvisoryLock } from "@/lib/postgres-advisory-lock";
import { getPrisma } from "@/lib/prisma";
import { z } from "zod";

const MAX_PAGE_SIZE = 50;
const MAX_ASSIGNMENTS = 100;
const MAX_QUESTIONS = 30;
const MAX_INTERACTIVE_FIELDS = 120;
const MAX_SUBMISSIONS = 50;
const MAX_STUDENT_OPTIONS = 500;
const MAX_ANSWERS = 140;
const MAX_TOTAL_ANSWER_CHARACTERS = 200_000;

const positiveInteger = z.preprocess(
  (value) =>
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value,
  z.number().int().positive(),
);

const listInputSchema = z
  .object({
    cursor: z.string().trim().min(1).max(200).optional(),
    limit: positiveInteger.pipe(z.number().int().max(MAX_PAGE_SIZE)).default(20),
    query: z.string().trim().max(80).optional(),
    status: z.enum(["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"]).default("ALL"),
  })
  .strict();

const activityIdSchema = z.string().trim().min(1).max(200);
const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .nullable()
    .transform((value) => value || null);
const updateInputSchema = z
  .object({
    category: z.string().trim().min(2).max(80),
    confirmChange: z.literal(true),
    description: optionalText(1600),
    expectedUpdatedAt: z.string().datetime(),
    level: z.string().trim().min(1).max(80),
    operationId: z.string().uuid(),
    releaseMode: z.enum(["ALL", "STUDENT"]),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    studentProfileId: z.string().trim().min(1).max(200).nullable(),
    title: z.string().trim().min(3).max(160),
    xpReward: z.number().int().min(1).max(500),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.releaseMode === "STUDENT" && !input.studentProfileId) {
      context.addIssue({ code: "custom", path: ["studentProfileId"] });
    }
    if (input.releaseMode === "ALL" && input.studentProfileId !== null) {
      context.addIssue({ code: "custom", path: ["studentProfileId"] });
    }
  });
const reviewInputSchema = z
  .object({
    confirmReview: z.literal(true),
    expectedUpdatedAt: z.string().datetime(),
    feedback: optionalText(3000),
    operationId: z.string().uuid(),
    outcome: z.enum(["APPROVE", "RETURN"]),
  })
  .strict();

const assignmentSelect = {
  studentProfile: {
    select: { id: true, user: { select: { name: true } } },
  },
} satisfies Prisma.CandyXpActivityAssignmentSelect;

export const mobileAdminCandyXpActivitySelect = {
  _count: { select: { submissions: true } },
  assetFileName: true,
  assetMimeType: true,
  assetPageCount: true,
  assetSizeBytes: true,
  assignments: {
    orderBy: { assignedAt: "asc" as const },
    select: assignmentSelect,
    take: MAX_ASSIGNMENTS + 1,
  },
  category: true,
  createdAt: true,
  description: true,
  id: true,
  level: true,
  publishedAt: true,
  status: true,
  title: true,
  updatedAt: true,
  xpReward: true,
} satisfies Prisma.CandyXpActivitySelect;

const questionSelect = {
  correctAnswer: true,
  id: true,
  options: true,
  prompt: true,
  required: true,
  sortOrder: true,
  type: true,
} satisfies Prisma.CandyXpActivityQuestionSelect;
const interactiveFieldSelect = {
  height: true,
  id: true,
  label: true,
  page: true,
  placeholder: true,
  required: true,
  sortOrder: true,
  type: true,
  width: true,
  x: true,
  y: true,
} satisfies Prisma.CandyXpActivityInteractiveFieldSelect;
const submissionSelect = {
  answers: true,
  autoScorePercent: true,
  awardedXp: true,
  feedback: true,
  id: true,
  reviewedAt: true,
  reviewedByUser: { select: { name: true } },
  status: true,
  studentProfile: { select: { user: { select: { name: true } } } },
  submittedAt: true,
  updatedAt: true,
} satisfies Prisma.CandyXpActivitySubmissionSelect;

const activityDetailSelect = {
  ...mobileAdminCandyXpActivitySelect,
  interactiveFields: {
    orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }],
    select: interactiveFieldSelect,
    take: MAX_INTERACTIVE_FIELDS + 1,
  },
  questions: {
    orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }],
    select: questionSelect,
    take: MAX_QUESTIONS + 1,
  },
  submissions: {
    orderBy: [{ updatedAt: "desc" as const }, { id: "desc" as const }],
    select: submissionSelect,
    take: MAX_SUBMISSIONS + 1,
  },
} satisfies Prisma.CandyXpActivitySelect;

const reviewSubmissionSelect = {
  ...submissionSelect,
  activity: { select: { id: true, title: true, xpReward: true } },
  studentProfile: {
    select: { user: { select: { id: true, name: true } } },
  },
  xpEventId: true,
} satisfies Prisma.CandyXpActivitySubmissionSelect;

const operationSelect = {
  actorUserId: true,
  kind: true,
  operationId: true,
  payloadDigest: true,
  targetId: true,
} satisfies Prisma.MobileAdminCandyXpOperationSelect;

type ActivityRow = Prisma.CandyXpActivityGetPayload<{
  select: typeof mobileAdminCandyXpActivitySelect;
}>;
type ActivityDetailRow = Prisma.CandyXpActivityGetPayload<{
  select: typeof activityDetailSelect;
}>;
type SubmissionRow = Prisma.CandyXpActivitySubmissionGetPayload<{
  select: typeof submissionSelect;
}>;
type OperationRow = Prisma.MobileAdminCandyXpOperationGetPayload<{
  select: typeof operationSelect;
}>;

export type MobileAdminCandyXpStore = Pick<
  ReturnType<typeof getPrisma>,
  | "$transaction"
  | "candyXpActivity"
  | "candyXpActivityAssignment"
  | "candyXpActivitySubmission"
  | "mobileAdminCandyXpOperation"
  | "studentProfile"
>;

type AwardResult = {
  event: CandyXpEventInput;
  studentUserId: string;
};
type Options = {
  acquireLock?: (
    tx: Prisma.TransactionClient,
    key: string,
  ) => Promise<void>;
  awardSubmission?: (
    tx: Prisma.TransactionClient,
    input: {
      activityId: string;
      sourceKey: string;
      studentUserId: string;
      submissionId: string;
      xpReward: number;
    },
  ) => Promise<AwardResult>;
  getRanking?: (input: {
    currentUserId: string;
    limit: number;
  }) => Promise<CandyXpRankingSnapshot>;
  now?: () => Date;
  refreshAward?: (
    event: CandyXpEventInput,
    studentUserId: string,
  ) => Promise<void>;
  store?: MobileAdminCandyXpStore;
};

export class MobileAdminCandyXpError extends Error {
  constructor(
    public readonly code:
      | "EDIT_CONFLICT"
      | "INVALID_INPUT"
      | "INVALID_QUERY"
      | "NOT_FOUND"
      | "OPERATION_CONFLICT"
      | "RESULT_LIMIT"
      | "REVIEW_CONFLICT"
      | "ROLE_FORBIDDEN"
      | "STUDENT_NOT_FOUND"
      | "WRITE_CONFLICT",
  ) {
    super(code);
    this.name = "MobileAdminCandyXpError";
  }
}

function requireAdmin(actor: MobileAuthUser) {
  if (actor.role !== "ADMIN") {
    throw new MobileAdminCandyXpError("ROLE_FORBIDDEN");
  }
}

function safeText(value: string, maximum: number, fallback: string) {
  return value.trim().slice(0, maximum) || fallback;
}

function safeNullableText(value: string | null, maximum: number) {
  const normalized = value?.trim().slice(0, maximum);
  return normalized || null;
}

function assertActivityBounds(row: ActivityRow) {
  if (row.assignments.length > MAX_ASSIGNMENTS) {
    throw new MobileAdminCandyXpError("RESULT_LIMIT");
  }
}

export function serializeMobileAdminCandyXpActivity(row: ActivityRow) {
  assertActivityBounds(row);
  return {
    asset: row.assetFileName
      ? {
          fileName: safeText(row.assetFileName, 180, "atividade"),
          mimeType: safeNullableText(row.assetMimeType, 120),
          pageCount: Math.max(1, row.assetPageCount),
          sizeBytes: row.assetSizeBytes,
        }
      : null,
    category: safeText(row.category, 80, "Candy XP"),
    createdAt: row.createdAt.toISOString(),
    description: safeNullableText(row.description, 1600),
    id: row.id,
    level: safeText(row.level, 80, "Livre"),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    release: {
      mode: row.assignments.length === 0 ? ("ALL" as const) : ("STUDENT" as const),
      students: row.assignments.map((assignment) => ({
        id: assignment.studentProfile.id,
        name: safeText(assignment.studentProfile.user.name, 120, "Aluno"),
      })),
    },
    status: row.status,
    submissionCount: row._count.submissions,
    title: safeText(row.title, 160, "Atividade Candy XP"),
    updatedAt: row.updatedAt.toISOString(),
    xpReward: row.xpReward,
  };
}

function serializeAnswers(value: unknown) {
  const answers = readCandyXpSubmissionAnswers(value);
  if (answers.length > MAX_ANSWERS) {
    throw new MobileAdminCandyXpError("RESULT_LIMIT");
  }
  let totalCharacters = 0;
  return answers.map((answer) => {
    if (answer.questionId.length > 200 || answer.value.length > 20_000) {
      throw new MobileAdminCandyXpError("RESULT_LIMIT");
    }
    totalCharacters += answer.value.length;
    if (totalCharacters > MAX_TOTAL_ANSWER_CHARACTERS) {
      throw new MobileAdminCandyXpError("RESULT_LIMIT");
    }
    return answer;
  });
}

function serializeSubmission(row: SubmissionRow) {
  return {
    answers: serializeAnswers(row.answers),
    autoScorePercent: row.autoScorePercent,
    awardedXp: row.awardedXp,
    feedback: safeNullableText(row.feedback, 3000),
    id: row.id,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewedByName: row.reviewedByUser
      ? safeText(row.reviewedByUser.name, 120, "Equipe Candy English")
      : null,
    status: row.status,
    studentName: safeText(row.studentProfile.user.name, 120, "Aluno"),
    submittedAt: row.submittedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeActivityDetail(row: ActivityDetailRow) {
  if (
    row.questions.length > MAX_QUESTIONS ||
    row.interactiveFields.length > MAX_INTERACTIVE_FIELDS ||
    row.submissions.length > MAX_SUBMISSIONS
  ) {
    throw new MobileAdminCandyXpError("RESULT_LIMIT");
  }
  return {
    ...serializeMobileAdminCandyXpActivity(row),
    interactiveFields: row.interactiveFields,
    questions: row.questions,
    submissions: row.submissions.map(serializeSubmission),
  };
}

function serializeRanking(snapshot: CandyXpRankingSnapshot) {
  return {
    generatedAt: snapshot.generatedAt,
    topEntries: snapshot.topEntries.map((entry) => ({
      level: entry.level,
      name: safeText(entry.name, 120, "Candy learner"),
      position: entry.position,
      role: entry.role,
      totalXp: entry.totalXp,
    })),
    totalRanked: snapshot.totalRanked,
  };
}

function payloadDigest(kind: string, targetId: string, input: unknown) {
  return createHash("sha256")
    .update(JSON.stringify({ input, kind, targetId }))
    .digest("hex");
}

function assertCompatibleOperation(
  operation: OperationRow,
  actor: MobileAuthUser,
  kind: string,
  targetId: string,
  digest: string,
) {
  if (
    operation.actorUserId !== actor.id ||
    operation.kind !== kind ||
    operation.targetId !== targetId ||
    operation.payloadDigest !== digest
  ) {
    throw new MobileAdminCandyXpError("OPERATION_CONFLICT");
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function getMobileAdminCandyXp(
  actor: MobileAuthUser,
  input: unknown,
  options: Options = {},
) {
  requireAdmin(actor);
  const parsed = listInputSchema.safeParse(input);
  if (!parsed.success) throw new MobileAdminCandyXpError("INVALID_QUERY");
  const store = options.store ?? getPrisma();
  const query = parsed.data.query?.trim();
  const where: Prisma.CandyXpActivityWhereInput = {
    ...(parsed.data.status === "ALL" ? {} : { status: parsed.data.status }),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { category: { contains: query, mode: "insensitive" } },
            { level: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [rows, total, draft, published, archived, pendingReviews, ranking] =
    await Promise.all([
      store.candyXpActivity.findMany({
        ...(parsed.data.cursor
          ? { cursor: { id: parsed.data.cursor }, skip: 1 }
          : {}),
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        select: mobileAdminCandyXpActivitySelect,
        take: parsed.data.limit + 1,
        where,
      }),
      store.candyXpActivity.count(),
      store.candyXpActivity.count({ where: { status: "DRAFT" } }),
      store.candyXpActivity.count({ where: { status: "PUBLISHED" } }),
      store.candyXpActivity.count({ where: { status: "ARCHIVED" } }),
      store.candyXpActivitySubmission.count({ where: { status: "SUBMITTED" } }),
      (options.getRanking ?? getCandyXpRankingSnapshot)({
        currentUserId: actor.id,
        limit: 10,
      }),
    ]);
  const hasMore = rows.length > parsed.data.limit;
  const page = rows.slice(0, parsed.data.limit);
  page.forEach(assertActivityBounds);
  return {
    activities: page.map(serializeMobileAdminCandyXpActivity),
    generatedAt: (options.now?.() ?? new Date()).toISOString(),
    hasMore,
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    ranking: serializeRanking(ranking),
    summary: { archived, draft, pendingReviews, published, total },
  };
}

export async function getMobileAdminCandyXpActivity(
  actor: MobileAuthUser,
  activityId: unknown,
  options: Options = {},
) {
  requireAdmin(actor);
  const parsedId = activityIdSchema.safeParse(activityId);
  if (!parsedId.success) throw new MobileAdminCandyXpError("INVALID_INPUT");
  const store = options.store ?? getPrisma();
  const [activity, students] = await Promise.all([
    store.candyXpActivity.findUnique({
      select: activityDetailSelect,
      where: { id: parsedId.data },
    }),
    store.studentProfile.findMany({
      orderBy: [{ user: { name: "asc" } }, { id: "asc" }],
      select: { id: true, user: { select: { name: true } } },
      take: MAX_STUDENT_OPTIONS + 1,
      where: { user: { is: { isActive: true, role: "STUDENT" } } },
    }),
  ]);
  if (!activity) throw new MobileAdminCandyXpError("NOT_FOUND");
  if (students.length > MAX_STUDENT_OPTIONS) {
    throw new MobileAdminCandyXpError("RESULT_LIMIT");
  }
  return {
    activity: serializeActivityDetail(activity),
    students: students.map((student) => ({
      id: student.id,
      name: safeText(student.user.name, 120, "Aluno"),
    })),
  };
}

export async function updateMobileAdminCandyXpActivity(
  actor: MobileAuthUser,
  activityId: unknown,
  input: unknown,
  options: Options = {},
) {
  requireAdmin(actor);
  const parsedId = activityIdSchema.safeParse(activityId);
  const parsed = updateInputSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) {
    throw new MobileAdminCandyXpError("INVALID_INPUT");
  }
  const store = options.store ?? getPrisma();
  const acquireLock = options.acquireLock ?? acquireTransactionAdvisoryLock;
  const digest = payloadDigest("UPDATE_ACTIVITY", parsedId.data, parsed.data);
  try {
    const result = await store.$transaction(async (tx) => {
      await acquireLock(tx, `admin-candy-xp:operation:${parsed.data.operationId}`);
      await acquireLock(tx, `admin-candy-xp:activity:${parsedId.data}`);
      const prior = await tx.mobileAdminCandyXpOperation.findUnique({
        select: operationSelect,
        where: { operationId: parsed.data.operationId },
      });
      if (prior) {
        assertCompatibleOperation(
          prior,
          actor,
          "UPDATE_ACTIVITY",
          parsedId.data,
          digest,
        );
        const replay = await tx.candyXpActivity.findUnique({
          select: mobileAdminCandyXpActivitySelect,
          where: { id: parsedId.data },
        });
        if (!replay) throw new MobileAdminCandyXpError("NOT_FOUND");
        return { activity: replay, replayed: true };
      }
      const current = await tx.candyXpActivity.findUnique({
        select: mobileAdminCandyXpActivitySelect,
        where: { id: parsedId.data },
      });
      if (!current) throw new MobileAdminCandyXpError("NOT_FOUND");
      if (current.updatedAt.toISOString() !== parsed.data.expectedUpdatedAt) {
        throw new MobileAdminCandyXpError("EDIT_CONFLICT");
      }
      if (parsed.data.releaseMode === "STUDENT") {
        const student = await tx.studentProfile.findFirst({
          select: { id: true },
          where: {
            id: parsed.data.studentProfileId!,
            user: { is: { isActive: true, role: "STUDENT" } },
          },
        });
        if (!student) throw new MobileAdminCandyXpError("STUDENT_NOT_FOUND");
      }
      const updated = await tx.candyXpActivity.updateMany({
        data: {
          category: parsed.data.category,
          description: parsed.data.description,
          level: parsed.data.level,
          publishedAt:
            parsed.data.status === "PUBLISHED" && !current.publishedAt
              ? options.now?.() ?? new Date()
              : current.publishedAt,
          status: parsed.data.status,
          title: parsed.data.title,
          xpReward: parsed.data.xpReward,
        },
        where: { id: current.id, updatedAt: current.updatedAt },
      });
      if (updated.count !== 1) {
        throw new MobileAdminCandyXpError("WRITE_CONFLICT");
      }
      await tx.candyXpActivityAssignment.deleteMany({
        where: { activityId: current.id },
      });
      if (parsed.data.releaseMode === "STUDENT") {
        await tx.candyXpActivityAssignment.create({
          data: {
            activityId: current.id,
            studentProfileId: parsed.data.studentProfileId!,
          },
        });
      }
      await tx.mobileAdminCandyXpOperation.create({
        data: {
          actorUserId: actor.id,
          kind: "UPDATE_ACTIVITY",
          operationId: parsed.data.operationId,
          payloadDigest: digest,
          targetId: current.id,
        },
        select: operationSelect,
      });
      const saved = await tx.candyXpActivity.findUnique({
        select: mobileAdminCandyXpActivitySelect,
        where: { id: current.id },
      });
      if (!saved) throw new MobileAdminCandyXpError("WRITE_CONFLICT");
      return { activity: saved, replayed: false };
    });
    return {
      activity: serializeMobileAdminCandyXpActivity(result.activity),
      replayed: result.replayed,
    };
  } catch (error) {
    if (error instanceof MobileAdminCandyXpError) throw error;
    if (isUniqueConstraintError(error)) {
      throw new MobileAdminCandyXpError("WRITE_CONFLICT");
    }
    throw error;
  }
}

async function defaultAwardSubmission(
  tx: Prisma.TransactionClient,
  input: {
    activityId: string;
    sourceKey: string;
    studentUserId: string;
    submissionId: string;
    xpReward: number;
  },
): Promise<AwardResult> {
  const event = await awardCandyXpActivityInTransaction(tx, input);
  return { event, studentUserId: input.studentUserId };
}

export async function reviewMobileAdminCandyXpSubmission(
  actor: MobileAuthUser,
  submissionId: unknown,
  input: unknown,
  options: Options = {},
) {
  requireAdmin(actor);
  const parsedId = z.string().trim().min(1).max(200).safeParse(submissionId);
  const parsed = reviewInputSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) {
    throw new MobileAdminCandyXpError("INVALID_INPUT");
  }
  const store = options.store ?? getPrisma();
  const acquireLock = options.acquireLock ?? acquireTransactionAdvisoryLock;
  const digest = payloadDigest("REVIEW_SUBMISSION", parsedId.data, parsed.data);
  const awardSubmission = options.awardSubmission ?? defaultAwardSubmission;
  try {
    const result = await store.$transaction(async (tx) => {
      await acquireLock(tx, `admin-candy-xp:operation:${parsed.data.operationId}`);
      await acquireLock(tx, `admin-candy-xp:submission:${parsedId.data}`);
      const prior = await tx.mobileAdminCandyXpOperation.findUnique({
        select: operationSelect,
        where: { operationId: parsed.data.operationId },
      });
      if (prior) {
        assertCompatibleOperation(
          prior,
          actor,
          "REVIEW_SUBMISSION",
          parsedId.data,
          digest,
        );
        const replay = await tx.candyXpActivitySubmission.findUnique({
          select: submissionSelect,
          where: { id: parsedId.data },
        });
        if (!replay) throw new MobileAdminCandyXpError("NOT_FOUND");
        return { award: null, replayed: true, submission: replay };
      }
      const current = await tx.candyXpActivitySubmission.findUnique({
        select: reviewSubmissionSelect,
        where: { id: parsedId.data },
      });
      if (!current) throw new MobileAdminCandyXpError("NOT_FOUND");
      if (current.updatedAt.toISOString() !== parsed.data.expectedUpdatedAt) {
        throw new MobileAdminCandyXpError("EDIT_CONFLICT");
      }
      if (current.status !== "SUBMITTED") {
        throw new MobileAdminCandyXpError("REVIEW_CONFLICT");
      }
      const approved = parsed.data.outcome === "APPROVE";
      if (!approved && (current.awardedXp !== null || current.xpEventId !== null)) {
        throw new MobileAdminCandyXpError("REVIEW_CONFLICT");
      }
      const updated = await tx.candyXpActivitySubmission.updateMany({
        data: {
          feedback:
            parsed.data.feedback ??
            (approved
              ? `Concluido. +${current.activity.xpReward} XP.`
              : "Revise e envie novamente."),
          reviewedAt: options.now?.() ?? new Date(),
          reviewedByUserId: actor.id,
          status: approved ? "REVIEWED" : "RETURNED",
        },
        where: {
          id: current.id,
          status: "SUBMITTED",
          updatedAt: current.updatedAt,
          ...(!approved ? { awardedXp: null, xpEventId: null } : {}),
        },
      });
      if (updated.count !== 1) {
        throw new MobileAdminCandyXpError("WRITE_CONFLICT");
      }
      const award = approved
        ? await awardSubmission(tx, {
            activityId: current.activity.id,
            sourceKey: `student:candy-xp-activity:${current.id}`,
            studentUserId: current.studentProfile.user.id,
            submissionId: current.id,
            xpReward: current.activity.xpReward,
          })
        : null;
      await tx.mobileAdminCandyXpOperation.create({
        data: {
          actorUserId: actor.id,
          kind: "REVIEW_SUBMISSION",
          operationId: parsed.data.operationId,
          payloadDigest: digest,
          targetId: current.id,
        },
        select: operationSelect,
      });
      const saved = await tx.candyXpActivitySubmission.findUnique({
        select: submissionSelect,
        where: { id: current.id },
      });
      if (!saved) throw new MobileAdminCandyXpError("WRITE_CONFLICT");
      return { award, replayed: false, submission: saved };
    });
    if (result.award) {
      await (options.refreshAward ?? refreshCandyXpActivityAward)(
        result.award.event,
        result.award.studentUserId,
      );
    }
    return {
      replayed: result.replayed,
      submission: serializeSubmission(result.submission),
    };
  } catch (error) {
    if (error instanceof MobileAdminCandyXpError) throw error;
    if (isUniqueConstraintError(error)) {
      throw new MobileAdminCandyXpError("WRITE_CONFLICT");
    }
    throw error;
  }
}
