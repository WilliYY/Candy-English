import { Prisma } from "@/generated/prisma/client";
import {
  evaluateCandyXpActivityAnswers,
  getCandyXpQuestionOptions,
} from "@/lib/candy-xp-activities";
import {
  recordCandyXpEventsForUser,
  type CandyXpEventInput,
} from "@/lib/candy-xp-persistence";
import {
  normalizeTinyTextAnswer,
  type InteractiveHomeworkFieldType,
} from "@/lib/interactive-homework-fields";
import { getPrisma } from "@/lib/prisma";
import {
  candyXpActivityAnswerSchema,
  type CandyXpActivityAnswerInput,
} from "@/lib/validations/candy-xp-activities";

export type MobileCandyXpAnswer = {
  questionId: string;
  value: string;
};

export type MobileCandyXpActivitySubmission = {
  answers: MobileCandyXpAnswer[];
  autoScorePercent: number | null;
  awardedXp: number | null;
  feedback: string | null;
  id: string;
  status: "DRAFT" | "RETURNED" | "REVIEWED" | "SUBMITTED";
  submittedAt: string | null;
};

export type MobileCandyXpActivityDetail = {
  asset: {
    fileName: string;
    kind: "IMAGE" | "PDF";
    mimeType: string;
    pageCount: number;
    sizeBytes: number;
  } | null;
  canSubmit: boolean;
  category: string;
  description: string | null;
  id: string;
  interactiveFields: {
    height: number;
    id: string;
    label: string | null;
    page: number;
    placeholder: string | null;
    required: boolean;
    sortOrder: number;
    type: InteractiveHomeworkFieldType;
    width: number;
    x: number;
    y: number;
  }[];
  level: string;
  questions: {
    id: string;
    options: { match?: string; text: string }[];
    prompt: string;
    required: boolean;
    sortOrder: number;
    type:
      | "CHECKBOX"
      | "LONG_TEXT"
      | "MATCHING"
      | "MULTIPLE_CHOICE"
      | "SHORT_TEXT";
  }[];
  submission: MobileCandyXpActivitySubmission | null;
  title: string;
  xpReward: number;
};

type StudentCandyXpMutationResult = {
  data?: {
    replayed: boolean;
    submission: MobileCandyXpActivitySubmission;
  };
  message: string;
  ok: boolean;
  reason?: "CONFLICT" | "INVALID" | "NOT_FOUND";
};

type CandyXpActivityAwardInput = {
  activityId: string;
  sourceKey: string;
  studentUserId: string;
  submissionId: string;
  xpReward: number;
};

const editableStatuses = ["DRAFT", "RETURNED"] as const;

const submissionSelect = {
  answers: true,
  autoScorePercent: true,
  awardedXp: true,
  feedback: true,
  id: true,
  status: true,
  submittedAt: true,
  xpEventId: true,
} satisfies Prisma.CandyXpActivitySubmissionSelect;

export function readCandyXpSubmissionAnswers(
  value: unknown,
): MobileCandyXpAnswer[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((answer) => {
    if (
      typeof answer !== "object" ||
      answer === null ||
      !("questionId" in answer) ||
      !("value" in answer) ||
      typeof answer.questionId !== "string" ||
      answer.questionId.length === 0 ||
      typeof answer.value !== "string"
    ) {
      return [];
    }

    return [{ questionId: answer.questionId, value: answer.value }];
  });
}

export function candyXpAnswersAreEqual(left: unknown, right: unknown) {
  return (
    JSON.stringify(readCandyXpSubmissionAnswers(left)) ===
    JSON.stringify(readCandyXpSubmissionAnswers(right))
  );
}

export function toMobileCandyXpQuestion(question: {
  correctAnswer: unknown;
  id: string;
  options: unknown;
  prompt: string;
  required: boolean;
  sortOrder: number;
  type:
    | "CHECKBOX"
    | "LONG_TEXT"
    | "MATCHING"
    | "MULTIPLE_CHOICE"
    | "SHORT_TEXT";
}) {
  return {
    id: question.id,
    options: getCandyXpQuestionOptions(question.options),
    prompt: question.prompt,
    required: question.required,
    sortOrder: question.sortOrder,
    type: question.type,
  };
}

function toMobileSubmission(submission: {
  answers: unknown;
  autoScorePercent: number | null;
  awardedXp: number | null;
  feedback: string | null;
  id: string;
  status: "DRAFT" | "RETURNED" | "REVIEWED" | "SUBMITTED";
  submittedAt: Date | null;
}) {
  return {
    answers: readCandyXpSubmissionAnswers(submission.answers),
    autoScorePercent: submission.autoScorePercent,
    awardedXp: submission.awardedXp,
    feedback: submission.feedback,
    id: submission.id,
    status: submission.status,
    submittedAt: submission.submittedAt?.toISOString() ?? null,
  } satisfies MobileCandyXpActivitySubmission;
}

function hasDrawingAnswerValue(value: string) {
  if (!value) {
    return false;
  }

  try {
    const parsed = JSON.parse(value) as { strokes?: unknown };

    return (
      Array.isArray(parsed.strokes) &&
      parsed.strokes.some(
        (stroke) =>
          Array.isArray(stroke) &&
          stroke.some(
            (point) =>
              Array.isArray(point) &&
              typeof point[0] === "number" &&
              typeof point[1] === "number",
          ),
      )
    );
  } catch {
    return false;
  }
}

function hasInteractiveFieldAnswer(
  field: {
    required: boolean;
    type: InteractiveHomeworkFieldType;
  },
  value: string,
) {
  if (!field.required) {
    return true;
  }

  if (field.type === "CHECKBOX") {
    return value === "true";
  }

  if (field.type === "DRAWING") {
    return hasDrawingAnswerValue(value);
  }

  return value.trim().length > 0;
}

async function getStudentActivityContext(userId: string, activityId: string) {
  const prisma = getPrisma();
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!studentProfile) {
    return null;
  }

  const activity = await prisma.candyXpActivity.findUnique({
    where: { id: activityId },
    select: {
      assetFileName: true,
      assetMimeType: true,
      assetPageCount: true,
      assetSizeBytes: true,
      assetStoragePath: true,
      assignments: {
        select: { studentProfileId: true },
      },
      category: true,
      description: true,
      id: true,
      interactiveFields: {
        orderBy: { sortOrder: "asc" },
        select: {
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
        },
      },
      level: true,
      questions: {
        orderBy: { sortOrder: "asc" },
        select: {
          correctAnswer: true,
          id: true,
          options: true,
          prompt: true,
          required: true,
          sortOrder: true,
          type: true,
        },
      },
      status: true,
      submissions: {
        where: { studentProfileId: studentProfile.id },
        select: submissionSelect,
        take: 1,
      },
      title: true,
      xpReward: true,
    },
  });

  if (!activity || activity.status !== "PUBLISHED") {
    return null;
  }

  const isAssigned =
    activity.assignments.length === 0 ||
    activity.assignments.some(
      (assignment) => assignment.studentProfileId === studentProfile.id,
    );

  return isAssigned ? { activity, studentProfile } : null;
}

function normalizeActivityAnswers(
  answers: CandyXpActivityAnswerInput["answers"],
  context: NonNullable<
    Awaited<ReturnType<typeof getStudentActivityContext>>
  >["activity"],
) {
  const allowedAnswerIds = new Set([
    ...context.questions.map((question) => question.id),
    ...context.interactiveFields.map((field) => field.id),
  ]);
  const tinyTextFieldIds = new Set(
    context.interactiveFields
      .filter((field) => field.type === "TINY_TEXT")
      .map((field) => field.id),
  );

  return answers
    .filter((answer) => allowedAnswerIds.has(answer.questionId))
    .map((answer) => ({
      questionId: answer.questionId,
      value: tinyTextFieldIds.has(answer.questionId)
        ? normalizeTinyTextAnswer(answer.value)
        : answer.value,
    }));
}

async function lockCandyXpActivitySubmission(
  tx: Prisma.TransactionClient,
  activityId: string,
  studentProfileId: string,
) {
  const lockKey = `candy-xp-submission:${activityId}:${studentProfileId}`;

  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0::bigint))
  `;
}

function buildCandyXpActivityEvent(
  input: CandyXpActivityAwardInput,
): CandyXpEventInput {
  return {
    kind: "CANDY_XP_ACTIVITY_COMPLETED",
    metadata: {
      activityId: input.activityId,
      submissionId: input.submissionId,
    },
    sourceKey: input.sourceKey,
    sourceLabel: "Candy XP",
    xp: input.xpReward,
  };
}

async function awardCandyXpActivityInTransaction(
  tx: Prisma.TransactionClient,
  input: CandyXpActivityAwardInput,
) {
  const event = buildCandyXpActivityEvent(input);

  await tx.candyXpProfile.upsert({
    where: { userId: input.studentUserId },
    create: {
      role: "STUDENT",
      userId: input.studentUserId,
    },
    update: { role: "STUDENT" },
  });
  await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "CandyXpProfile"
    WHERE "userId" = ${input.studentUserId}
    FOR UPDATE
  `;

  const xpEvent = await tx.candyXpEvent.upsert({
    where: {
      userId_sourceKey: {
        sourceKey: input.sourceKey,
        userId: input.studentUserId,
      },
    },
    create: {
      kind: event.kind,
      metadata: event.metadata,
      role: "STUDENT",
      sourceKey: event.sourceKey,
      sourceLabel: event.sourceLabel,
      userId: input.studentUserId,
      xp: event.xp,
    },
    update: {
      kind: event.kind,
      metadata: event.metadata,
      role: "STUDENT",
      sourceLabel: event.sourceLabel,
      xp: event.xp,
    },
    select: { id: true },
  });

  await tx.candyXpActivitySubmission.update({
    where: { id: input.submissionId },
    data: {
      awardedXp: input.xpReward,
      xpEventId: xpEvent.id,
    },
  });

  return event;
}

async function refreshCandyXpActivityAward(
  event: CandyXpEventInput,
  studentUserId: string,
) {
  await recordCandyXpEventsForUser({
    events: [event],
    role: "STUDENT",
    userId: studentUserId,
  });
}

function unavailable(): StudentCandyXpMutationResult {
  return {
    message: "Atividade Candy XP indisponivel.",
    ok: false,
    reason: "NOT_FOUND",
  };
}

function locked(status: string): StudentCandyXpMutationResult {
  return {
    message:
      status === "SUBMITTED"
        ? "Esta atividade esta aguardando correcao."
        : "Esta atividade ja foi concluida.",
    ok: false,
    reason: "CONFLICT",
  };
}

export async function getMobileStudentCandyXpActivity(
  userId: string,
  activityId: string,
): Promise<MobileCandyXpActivityDetail | null> {
  const context = await getStudentActivityContext(userId, activityId);

  if (!context) {
    return null;
  }

  const { activity } = context;
  const submission = activity.submissions[0] ?? null;
  const asset =
    activity.assetFileName &&
    activity.assetMimeType &&
    activity.assetSizeBytes &&
    activity.assetSizeBytes > 0
      ? {
          fileName: activity.assetFileName,
          kind:
            activity.assetMimeType === "application/pdf"
              ? ("PDF" as const)
              : ("IMAGE" as const),
          mimeType: activity.assetMimeType,
          pageCount: activity.assetPageCount,
          sizeBytes: activity.assetSizeBytes,
        }
      : null;

  return {
    asset,
    canSubmit:
      !submission ||
      editableStatuses.includes(
        submission.status as (typeof editableStatuses)[number],
      ),
    category: activity.category,
    description: activity.description,
    id: activity.id,
    interactiveFields: activity.interactiveFields,
    level: activity.level,
    questions: activity.questions.map(toMobileCandyXpQuestion),
    submission: submission ? toMobileSubmission(submission) : null,
    title: activity.title,
    xpReward: activity.xpReward,
  };
}

export async function getMobileStudentCandyXpAsset(
  userId: string,
  activityId: string,
) {
  const context = await getStudentActivityContext(userId, activityId);

  if (
    !context?.activity.assetFileName ||
    !context.activity.assetMimeType ||
    !context.activity.assetSizeBytes ||
    !context.activity.assetStoragePath
  ) {
    return null;
  }

  return {
    fileName: context.activity.assetFileName,
    mimeType: context.activity.assetMimeType,
    sizeBytes: context.activity.assetSizeBytes,
    storagePath: context.activity.assetStoragePath,
  };
}

export async function saveStudentCandyXpDraft(
  userId: string,
  input: CandyXpActivityAnswerInput,
): Promise<StudentCandyXpMutationResult> {
  const parsed = candyXpActivityAnswerSchema.safeParse(input);

  if (!parsed.success) {
    return {
      message: parsed.error.issues[0]?.message ?? "Revise suas respostas.",
      ok: false,
      reason: "INVALID",
    };
  }

  const context = await getStudentActivityContext(
    userId,
    parsed.data.activityId,
  );

  if (!context) {
    return unavailable();
  }

  const { activity, studentProfile } = context;
  const answers = normalizeActivityAnswers(parsed.data.answers, activity);
  const transactionResult = await getPrisma().$transaction(async (tx) => {
    await lockCandyXpActivitySubmission(tx, activity.id, studentProfile.id);

    const current = await tx.candyXpActivitySubmission.findUnique({
      where: {
        activityId_studentProfileId: {
          activityId: activity.id,
          studentProfileId: studentProfile.id,
        },
      },
      select: submissionSelect,
    });

    if (
      current &&
      (!editableStatuses.includes(
        current.status as (typeof editableStatuses)[number],
      ) ||
        current.awardedXp !== null ||
        current.xpEventId !== null)
    ) {
      return { current, saved: false as const };
    }

    if (
      current?.status === "DRAFT" &&
      candyXpAnswersAreEqual(current.answers, answers)
    ) {
      return { current, replayed: true as const, saved: true as const };
    }

    const saved = current
      ? await tx.candyXpActivitySubmission.update({
          where: { id: current.id },
          data: {
            answers,
            autoScorePercent: null,
            feedback: null,
            reviewedAt: null,
            reviewedByUserId: null,
            status: "DRAFT",
            submittedAt: null,
          },
          select: submissionSelect,
        })
      : await tx.candyXpActivitySubmission.create({
          data: {
            activityId: activity.id,
            answers,
            status: "DRAFT",
            studentProfileId: studentProfile.id,
          },
          select: submissionSelect,
        });

    return { current: saved, replayed: false as const, saved: true as const };
  });

  if (!transactionResult.saved) {
    return locked(transactionResult.current.status);
  }

  return {
    data: {
      replayed: transactionResult.replayed,
      submission: toMobileSubmission(transactionResult.current),
    },
    message: "Progresso Candy XP salvo.",
    ok: true,
  };
}

export async function submitStudentCandyXpActivity(
  userId: string,
  input: CandyXpActivityAnswerInput,
): Promise<StudentCandyXpMutationResult> {
  const parsed = candyXpActivityAnswerSchema.safeParse(input);

  if (!parsed.success) {
    return {
      message: parsed.error.issues[0]?.message ?? "Revise suas respostas.",
      ok: false,
      reason: "INVALID",
    };
  }

  const context = await getStudentActivityContext(
    userId,
    parsed.data.activityId,
  );

  if (!context) {
    return unavailable();
  }

  const { activity, studentProfile } = context;
  const answers = normalizeActivityAnswers(parsed.data.answers, activity);
  const evaluation = evaluateCandyXpActivityAnswers({
    answers,
    questions: activity.questions,
  });
  const answerMap = new Map(
    answers.map((answer) => [answer.questionId, answer.value]),
  );
  const hasMissingInteractiveField = activity.interactiveFields.some(
    (field) => !hasInteractiveFieldAnswer(field, answerMap.get(field.id) ?? ""),
  );

  if (evaluation.hasMissingRequired || hasMissingInteractiveField) {
    return {
      message: hasMissingInteractiveField
        ? "Preencha as areas obrigatorias no PDF antes de enviar."
        : "Preencha as perguntas obrigatorias antes de enviar.",
      ok: false,
      reason: "INVALID",
    };
  }

  const now = new Date();
  const autoCompleted =
    !evaluation.hasManualQuestions && evaluation.allObjectiveCorrect;
  const nextStatus = evaluation.hasManualQuestions
    ? ("SUBMITTED" as const)
    : autoCompleted
      ? ("REVIEWED" as const)
      : ("RETURNED" as const);
  const feedback = evaluation.hasManualQuestions
    ? null
    : autoCompleted
      ? `Concluido automaticamente. +${activity.xpReward} XP.`
      : "Revise as respostas objetivas e tente novamente.";

  const transactionResult = await getPrisma().$transaction(async (tx) => {
    await lockCandyXpActivitySubmission(tx, activity.id, studentProfile.id);

    const current = await tx.candyXpActivitySubmission.findUnique({
      where: {
        activityId_studentProfileId: {
          activityId: activity.id,
          studentProfileId: studentProfile.id,
        },
      },
      select: submissionSelect,
    });

    if (
      current &&
      current.status !== "DRAFT" &&
      candyXpAnswersAreEqual(current.answers, answers)
    ) {
      const awardEvent =
        current.status === "REVIEWED" &&
        current.awardedXp !== null &&
        current.awardedXp > 0
          ? buildCandyXpActivityEvent({
              activityId: activity.id,
              sourceKey: `student:candy-xp-activity:${current.id}`,
              studentUserId: studentProfile.userId,
              submissionId: current.id,
              xpReward: current.awardedXp,
            })
          : null;

      return {
        awardEvent,
        current,
        replayed: true as const,
        submitted: true as const,
      };
    }

    if (
      current &&
      (!editableStatuses.includes(
        current.status as (typeof editableStatuses)[number],
      ) ||
        current.awardedXp !== null ||
        current.xpEventId !== null)
    ) {
      return { current, submitted: false as const };
    }

    const saved = current
      ? await tx.candyXpActivitySubmission.update({
          where: { id: current.id },
          data: {
            answers,
            autoScorePercent: evaluation.autoScorePercent,
            feedback,
            reviewedAt:
              nextStatus === "REVIEWED" || nextStatus === "RETURNED"
                ? now
                : null,
            reviewedByUserId: null,
            status: nextStatus,
            submittedAt: now,
          },
          select: submissionSelect,
        })
      : await tx.candyXpActivitySubmission.create({
          data: {
            activityId: activity.id,
            answers,
            autoScorePercent: evaluation.autoScorePercent,
            feedback,
            reviewedAt:
              nextStatus === "REVIEWED" || nextStatus === "RETURNED"
                ? now
                : null,
            status: nextStatus,
            studentProfileId: studentProfile.id,
            submittedAt: now,
          },
          select: submissionSelect,
        });
    const awardEvent = autoCompleted
      ? await awardCandyXpActivityInTransaction(tx, {
          activityId: activity.id,
          sourceKey: `student:candy-xp-activity:${saved.id}`,
          studentUserId: studentProfile.userId,
          submissionId: saved.id,
          xpReward: activity.xpReward,
        })
      : null;

    return {
      awardEvent,
      current: autoCompleted
        ? { ...saved, awardedXp: activity.xpReward }
        : saved,
      replayed: false as const,
      submitted: true as const,
    };
  });

  if (!transactionResult.submitted) {
    return locked(transactionResult.current.status);
  }

  if (transactionResult.awardEvent) {
    await refreshCandyXpActivityAward(
      transactionResult.awardEvent,
      studentProfile.userId,
    );
  }

  return {
    data: {
      replayed: transactionResult.replayed,
      submission: toMobileSubmission(transactionResult.current),
    },
    message:
      transactionResult.current.status === "REVIEWED"
        ? `Missao concluida. +${transactionResult.current.awardedXp ?? activity.xpReward} XP.`
        : transactionResult.current.status === "SUBMITTED"
          ? "Atividade enviada para correcao."
          : "Algumas respostas precisam ser revisadas.",
    ok: true,
  };
}
