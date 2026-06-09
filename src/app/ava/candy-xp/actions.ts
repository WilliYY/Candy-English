"use server";

import { unlink } from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { evaluateCandyXpActivityAnswers } from "@/lib/candy-xp-activities";
import {
  recordCandyXpEventsForUser,
  type CandyXpEventInput,
} from "@/lib/candy-xp-persistence";
import {
  normalizeTinyTextAnswer,
  type InteractiveHomeworkFieldType,
} from "@/lib/interactive-homework-fields";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import { getStoragePath, saveCandyXpAsset } from "@/lib/storage";
import {
  candyXpActivityAnswerSchema,
  candyXpActivityCreateSchema,
  candyXpActivityDeleteSchema,
  candyXpActivityReviewSchema,
  candyXpActivityUpdateSchema,
  saveCandyXpActivityInteractiveFieldsSchema,
  type CandyXpActivityAnswerInput,
  type CandyXpActivityCreateInput,
  type CandyXpActivityDeleteInput,
  type CandyXpActivityReviewInput,
  type CandyXpActivityUpdateInput,
  type SaveCandyXpActivityInteractiveFieldsInput,
  type SaveCandyXpActivityInteractiveFieldsOutput,
} from "@/lib/validations/candy-xp-activities";

export type CandyXpActivityCreateResult = {
  errors?: Partial<
    Record<keyof CandyXpActivityCreateInput | "asset" | "questionsJson", string>
  >;
  message: string;
  ok: boolean;
};

export type CandyXpActivityActionResult<
  TInput extends Record<string, unknown>,
> = {
  errors?: Partial<Record<keyof TInput, string>>;
  message: string;
  ok: boolean;
};

type SavedCandyXpActivityInteractiveField = {
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
};

type SaveCandyXpActivityInteractiveFieldsResult =
  CandyXpActivityActionResult<SaveCandyXpActivityInteractiveFieldsInput> & {
    expectedCount?: number;
    fields?: SavedCandyXpActivityInteractiveField[];
    savedCount?: number;
  };

function fieldErrors<TInput extends Record<string, unknown>>(
  issues: { message: string; path: PropertyKey[] }[],
) {
  return issues.reduce<Partial<Record<keyof TInput, string>>>(
    (accumulator, issue) => {
      const fieldName = issue.path[0];

      if (typeof fieldName === "string") {
        accumulator[fieldName as keyof TInput] = issue.message;
      }

      return accumulator;
    },
    {},
  );
}

function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseQuestionsJson(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type CandyXpActivityQuestionCreateData = NonNullable<
  CandyXpActivityCreateInput["questions"]
>[number];

function buildQuestionPersistence(question: CandyXpActivityQuestionCreateData) {
  const questionOptions = question.options ?? [];
  const correctAnswers = question.correctAnswers ?? [];
  const options =
    questionOptions.length > 0
      ? {
          items: questionOptions,
        }
      : undefined;

  if (question.type === "MATCHING") {
    return {
      correctAnswer: {
        pairs: questionOptions.map((option) => ({
          left: option.text,
          right: option.match ?? "",
        })),
      },
      options,
    };
  }

  if (
    question.type === "MULTIPLE_CHOICE" ||
    question.type === "CHECKBOX" ||
    correctAnswers.length > 0
  ) {
    return {
      correctAnswer: {
        values: correctAnswers,
      },
      options,
    };
  }

  return {
    correctAnswer: undefined,
    options,
  };
}

async function requireAdmin() {
  const session = await auth();

  if (!isRole(session?.user?.role) || session.user.role !== "ADMIN") {
    return null;
  }

  return session;
}

async function getStudentActor() {
  const session = await auth();

  if (!isRole(session?.user?.role) || session.user.role !== "STUDENT") {
    return null;
  }

  const prisma = getPrisma();
  const studentProfile = await prisma.studentProfile.findUnique({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  return studentProfile;
}

async function awardCandyXpActivity(input: {
  activityId: string;
  sourceKey: string;
  studentUserId: string;
  submissionId: string;
  xpReward: number;
}) {
  const event: CandyXpEventInput = {
    kind: "CANDY_XP_ACTIVITY_COMPLETED",
    metadata: {
      activityId: input.activityId,
      submissionId: input.submissionId,
    },
    sourceKey: input.sourceKey,
    sourceLabel: "Candy XP",
    xp: input.xpReward,
  };

  await recordCandyXpEventsForUser({
    events: [event],
    role: "STUDENT",
    userId: input.studentUserId,
  });

  const prisma = getPrisma();
  const xpEvent = await prisma.candyXpEvent.findUnique({
    where: {
      userId_sourceKey: {
        sourceKey: input.sourceKey,
        userId: input.studentUserId,
      },
    },
    select: {
      id: true,
    },
  });

  await prisma.candyXpActivitySubmission.update({
    where: {
      id: input.submissionId,
    },
    data: {
      awardedXp: input.xpReward,
      xpEventId: xpEvent?.id ?? null,
    },
  });
}

async function getVisibleActivityForStudent(
  activityId: string,
  studentProfileId: string,
) {
  const prisma = getPrisma();
  const activity = await prisma.candyXpActivity.findUnique({
    where: {
      id: activityId,
    },
    select: {
      assignments: {
        select: {
          studentProfileId: true,
        },
      },
      id: true,
      interactiveFields: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          id: true,
          required: true,
          type: true,
        },
      },
      questions: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          correctAnswer: true,
          id: true,
          options: true,
          required: true,
          type: true,
        },
      },
      status: true,
      submissions: {
        where: {
          studentProfileId,
        },
        select: {
          id: true,
          status: true,
        },
        take: 1,
      },
      xpReward: true,
    },
  });

  if (!activity || activity.status !== "PUBLISHED") {
    return null;
  }

  const isAssigned =
    activity.assignments.length === 0 ||
    activity.assignments.some(
      (assignment) => assignment.studentProfileId === studentProfileId,
    );

  return isAssigned ? activity : null;
}

export async function createCandyXpActivity(
  formData: FormData,
): Promise<CandyXpActivityCreateResult> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para criar Candy XP.",
    };
  }

  const questionsJson = formText(formData, "questionsJson");
  const parsed = candyXpActivityCreateSchema.safeParse({
    category: formText(formData, "category"),
    description: formText(formData, "description"),
    level: formText(formData, "level"),
    questions: parseQuestionsJson(questionsJson),
    releaseMode: formText(formData, "releaseMode"),
    status: formText(formData, "status"),
    studentProfileId: formText(formData, "studentProfileId"),
    title: formText(formData, "title"),
    xpReward: formText(formData, "xpReward"),
  });

  if (!parsed.success) {
    return {
      errors: fieldErrors<CandyXpActivityCreateInput>(parsed.error.issues),
      ok: false,
      message: "Revise os dados da atividade Candy XP.",
    };
  }

  const asset = formData.get("asset");

  if (!(asset instanceof File) || asset.size <= 0) {
    return {
      errors: {
        asset: "Envie o PDF ou imagem exportado do Canva.",
      },
      ok: false,
      message: "Envie o arquivo da atividade.",
    };
  }

  const prisma = getPrisma();
  const data = parsed.data;

  if (data.releaseMode === "STUDENT") {
    const student = await prisma.studentProfile.findUnique({
      where: {
        id: data.studentProfileId,
      },
      select: {
        id: true,
      },
    });

    if (!student) {
      return {
        errors: {
          studentProfileId: "Aluno nao encontrado.",
        },
        ok: false,
        message: "Selecione um aluno valido.",
      };
    }
  }

  let savedAsset: Awaited<ReturnType<typeof saveCandyXpAsset>>;

  try {
    savedAsset = await saveCandyXpAsset(asset);
  } catch (error) {
    return {
      errors: {
        asset: error instanceof Error ? error.message : "Arquivo invalido.",
      },
      ok: false,
      message: "Nao foi possivel salvar o arquivo Candy XP.",
    };
  }

  await prisma.candyXpActivity.create({
    data: {
      assetFileName: savedAsset.originalName,
      assetMimeType: savedAsset.mimeType,
      assetPageCount: savedAsset.pageCount,
      assetSizeBytes: savedAsset.sizeBytes,
      assetStoragePath: savedAsset.relativePath,
      category: data.category,
      createdByUserId: session.user.id,
      description: data.description ?? null,
      level: data.level,
      publishedAt: data.status === "PUBLISHED" ? new Date() : null,
      status: data.status,
      title: data.title,
      xpReward: data.xpReward,
      assignments:
        data.releaseMode === "STUDENT" && data.studentProfileId
          ? {
              create: {
                studentProfileId: data.studentProfileId,
              },
            }
          : undefined,
      questions:
        data.questions.length > 0
          ? {
              create: data.questions.map((question, index) => {
                const persistence = buildQuestionPersistence(question);

                return {
                  correctAnswer: persistence.correctAnswer,
                  options: persistence.options,
                  prompt: question.prompt,
                  required: question.required,
                  sortOrder: index,
                  type: question.type,
                };
              }),
            }
          : undefined,
    },
  });

  revalidatePath("/ava/admin");
  revalidatePath("/ava/student");

  return {
    ok: true,
    message: savedAsset.optimizationMessage
      ? `Atividade Candy XP criada. ${savedAsset.optimizationMessage}`
      : "Atividade Candy XP criada.",
  };
}

export async function updateCandyXpActivity(
  input: CandyXpActivityUpdateInput,
): Promise<CandyXpActivityActionResult<CandyXpActivityUpdateInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para editar Candy XP.",
    };
  }

  const parsed = candyXpActivityUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<CandyXpActivityUpdateInput>(parsed.error.issues),
      ok: false,
      message: "Revise os dados da atividade.",
    };
  }

  const prisma = getPrisma();
  const activity = await prisma.candyXpActivity.findUnique({
    where: {
      id: parsed.data.activityId,
    },
    select: {
      id: true,
      publishedAt: true,
      status: true,
    },
  });

  if (!activity) {
    return {
      ok: false,
      message: "Atividade nao encontrada.",
    };
  }

  await prisma.candyXpActivity.update({
    where: {
      id: activity.id,
    },
    data: {
      category: parsed.data.category,
      description: parsed.data.description ?? null,
      level: parsed.data.level,
      publishedAt:
        parsed.data.status === "PUBLISHED" && !activity.publishedAt
          ? new Date()
          : activity.publishedAt,
      status: parsed.data.status,
      title: parsed.data.title,
      xpReward: parsed.data.xpReward,
    },
  });

  revalidatePath("/ava/admin");
  revalidatePath("/ava/student");

  return {
    ok: true,
    message: "Atividade Candy XP atualizada.",
  };
}

function getInteractiveFieldMinimums(
  type: SaveCandyXpActivityInteractiveFieldsOutput["fields"][number]["type"],
) {
  if (type === "CHECKBOX") {
    return { height: 1, width: 1 };
  }

  if (type === "TINY_TEXT") {
    return { height: 1, width: 1 };
  }

  if (type === "SHORT_TEXT") {
    return { height: 1.2, width: 3 };
  }

  if (type === "DRAWING") {
    return { height: 6, width: 8 };
  }

  return { height: 4, width: 8 };
}

function isPersistedInteractiveFieldId(
  id: string | undefined,
  existingIds: Set<string>,
) {
  return Boolean(id && existingIds.has(id));
}

function normalizeInteractiveFieldForSave(
  field: SaveCandyXpActivityInteractiveFieldsOutput["fields"][number],
  index: number,
) {
  const minimums = getInteractiveFieldMinimums(field.type);
  const x = Math.min(field.x, 100 - minimums.width);
  const y = Math.min(field.y, 100 - minimums.height);
  const width = Math.max(minimums.width, Math.min(field.width, 100 - x));
  const height = Math.max(minimums.height, Math.min(field.height, 100 - y));

  return {
    height,
    label: field.label,
    page: field.page,
    placeholder: field.placeholder,
    required: field.required,
    sortOrder: index,
    type: field.type,
    width,
    x,
    y,
  };
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
    id: string;
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

export async function deleteCandyXpActivity(
  input: CandyXpActivityDeleteInput,
): Promise<CandyXpActivityActionResult<CandyXpActivityDeleteInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para excluir Candy XP.",
    };
  }

  const parsed = candyXpActivityDeleteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<CandyXpActivityDeleteInput>(parsed.error.issues),
      ok: false,
      message: "Atividade invalida.",
    };
  }

  const prisma = getPrisma();
  const activity = await prisma.candyXpActivity.findUnique({
    where: {
      id: parsed.data.activityId,
    },
    select: {
      _count: {
        select: {
          submissions: true,
        },
      },
      assetStoragePath: true,
      id: true,
    },
  });

  if (!activity) {
    return {
      ok: false,
      message: "Atividade Candy XP nao encontrada.",
    };
  }

  await prisma.candyXpActivity.delete({
    where: {
      id: activity.id,
    },
  });

  if (activity.assetStoragePath) {
    await unlink(getStoragePath(activity.assetStoragePath)).catch(
      () => undefined,
    );
  }

  revalidatePath("/ava/admin");
  revalidatePath("/ava/student");

  return {
    ok: true,
    message:
      activity._count.submissions > 0
        ? "Atividade Candy XP excluida. Respostas operacionais foram removidas; XP ja conquistado permanece no historico."
        : "Atividade Candy XP excluida.",
  };
}

export async function saveCandyXpActivityInteractiveFields(
  input: SaveCandyXpActivityInteractiveFieldsInput,
): Promise<SaveCandyXpActivityInteractiveFieldsResult> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para editar Candy XP.",
    };
  }

  const parsed = saveCandyXpActivityInteractiveFieldsSchema.safeParse(input);

  if (!parsed.success) {
    const errors = fieldErrors<SaveCandyXpActivityInteractiveFieldsInput>(
      parsed.error.issues,
    );

    return {
      errors,
      ok: false,
      message: errors.fields ?? "Revise as areas da atividade Candy XP.",
    };
  }

  const prisma = getPrisma();
  const activity = await prisma.candyXpActivity.findUnique({
    where: {
      id: parsed.data.activityId,
    },
    select: {
      id: true,
    },
  });

  if (!activity) {
    return {
      ok: false,
      message: "Atividade Candy XP nao encontrada.",
    };
  }

  const expectedCount = parsed.data.fields.length;
  let savedFields: SavedCandyXpActivityInteractiveField[];

  try {
    savedFields = await prisma.$transaction(async (tx) => {
      const existingFields = await tx.candyXpActivityInteractiveField.findMany({
        where: {
          activityId: activity.id,
        },
        select: {
          id: true,
        },
      });
      const existingIds = new Set(existingFields.map((field) => field.id));
      const retainedIds = parsed.data.fields
        .map((field) => field.id)
        .filter((id): id is string =>
          isPersistedInteractiveFieldId(id, existingIds),
        );

      await tx.candyXpActivityInteractiveField.deleteMany({
        where:
          retainedIds.length > 0
            ? {
                activityId: activity.id,
                id: {
                  notIn: retainedIds,
                },
              }
            : {
                activityId: activity.id,
              },
      });

      for (const [index, field] of parsed.data.fields.entries()) {
        const data = normalizeInteractiveFieldForSave(field, index);

        if (isPersistedInteractiveFieldId(field.id, existingIds)) {
          await tx.candyXpActivityInteractiveField.update({
            where: {
              id: field.id,
            },
            data,
          });
          continue;
        }

        await tx.candyXpActivityInteractiveField.create({
          data: {
            ...data,
            activityId: activity.id,
          },
        });
      }

      const confirmedCount = await tx.candyXpActivityInteractiveField.count({
        where: {
          activityId: activity.id,
        },
      });

      if (confirmedCount !== expectedCount) {
        throw new Error(
          `Candy XP field count mismatch: expected ${expectedCount}, saved ${confirmedCount}.`,
        );
      }

      return tx.candyXpActivityInteractiveField.findMany({
        where: {
          activityId: activity.id,
        },
        orderBy: {
          sortOrder: "asc",
        },
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
      });
    });
  } catch (error) {
    console.error("Failed to save Candy XP interactive fields", {
      activityId: activity.id,
      error,
      expectedCount,
    });

    return {
      expectedCount,
      ok: false,
      message:
        "Erro ao salvar areas. As alteracoes nao foram confirmadas; tente salvar novamente antes de sair.",
      savedCount: 0,
    };
  }

  if (savedFields.length !== expectedCount) {
    return {
      expectedCount,
      fields: savedFields,
      ok: false,
      message: `${savedFields.length} de ${expectedCount} area(s) foram salvas. Revise antes de sair e tente salvar novamente.`,
      savedCount: savedFields.length,
    };
  }

  revalidatePath("/ava/admin");
  revalidatePath("/ava/student");

  return {
    expectedCount,
    fields: savedFields,
    ok: true,
    message: `${savedFields.length} area(s) Candy XP salvas com sucesso.`,
    savedCount: savedFields.length,
  };
}

function normalizeActivityAnswers(
  answers: CandyXpActivityAnswerInput["answers"],
  allowedAnswerIds: Set<string>,
  tinyTextFieldIds: Set<string>,
) {
  return answers
    .filter((answer) => allowedAnswerIds.has(answer.questionId))
    .map((answer) => ({
      questionId: answer.questionId,
      value: tinyTextFieldIds.has(answer.questionId)
        ? normalizeTinyTextAnswer(answer.value)
        : answer.value,
    }));
}

export async function saveCandyXpActivityDraft(
  input: CandyXpActivityAnswerInput,
): Promise<CandyXpActivityActionResult<CandyXpActivityAnswerInput>> {
  const studentProfile = await getStudentActor();

  if (!studentProfile) {
    return {
      ok: false,
      message: "Use uma conta de aluno para salvar Candy XP.",
    };
  }

  const parsed = candyXpActivityAnswerSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<CandyXpActivityAnswerInput>(parsed.error.issues),
      ok: false,
      message: "Revise suas respostas.",
    };
  }

  const activity = await getVisibleActivityForStudent(
    parsed.data.activityId,
    studentProfile.id,
  );

  if (!activity) {
    return {
      ok: false,
      message: "Atividade Candy XP indisponivel.",
    };
  }

  const existingSubmission = activity.submissions[0];

  if (
    existingSubmission?.status === "SUBMITTED" ||
    existingSubmission?.status === "REVIEWED"
  ) {
    return {
      ok: false,
      message: "Esta atividade ja foi enviada.",
    };
  }

  const prisma = getPrisma();
  const allowedAnswerIds = new Set(
    [
      ...activity.questions.map((question) => question.id),
      ...activity.interactiveFields.map((field) => field.id),
    ],
  );
  const tinyTextFieldIds = new Set(
    activity.interactiveFields
      .filter((field) => field.type === "TINY_TEXT")
      .map((field) => field.id),
  );
  const answers = normalizeActivityAnswers(
    parsed.data.answers,
    allowedAnswerIds,
    tinyTextFieldIds,
  );

  await prisma.candyXpActivitySubmission.upsert({
    where: {
      activityId_studentProfileId: {
        activityId: activity.id,
        studentProfileId: studentProfile.id,
      },
    },
    create: {
      activityId: activity.id,
      answers,
      status: "DRAFT",
      studentProfileId: studentProfile.id,
    },
    update: {
      answers,
      feedback: null,
      status: "DRAFT",
    },
  });

  revalidatePath("/ava/student");

  return {
    ok: true,
    message: "Progresso Candy XP salvo.",
  };
}

export async function submitCandyXpActivity(
  input: CandyXpActivityAnswerInput,
): Promise<CandyXpActivityActionResult<CandyXpActivityAnswerInput>> {
  const studentProfile = await getStudentActor();

  if (!studentProfile) {
    return {
      ok: false,
      message: "Use uma conta de aluno para enviar Candy XP.",
    };
  }

  const parsed = candyXpActivityAnswerSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<CandyXpActivityAnswerInput>(parsed.error.issues),
      ok: false,
      message: "Revise suas respostas.",
    };
  }

  const activity = await getVisibleActivityForStudent(
    parsed.data.activityId,
    studentProfile.id,
  );

  if (!activity) {
    return {
      ok: false,
      message: "Atividade Candy XP indisponivel.",
    };
  }

  const existingSubmission = activity.submissions[0];

  if (existingSubmission?.status === "REVIEWED") {
    return {
      ok: false,
      message: "Esta atividade ja foi concluida.",
    };
  }

  if (existingSubmission?.status === "SUBMITTED") {
    return {
      ok: false,
      message: "Esta atividade esta aguardando correcao.",
    };
  }

  const prisma = getPrisma();
  const allowedAnswerIds = new Set(
    [
      ...activity.questions.map((question) => question.id),
      ...activity.interactiveFields.map((field) => field.id),
    ],
  );
  const tinyTextFieldIds = new Set(
    activity.interactiveFields
      .filter((field) => field.type === "TINY_TEXT")
      .map((field) => field.id),
  );
  const answers = normalizeActivityAnswers(
    parsed.data.answers,
    allowedAnswerIds,
    tinyTextFieldIds,
  );
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
      errors: {
        answers: hasMissingInteractiveField
          ? "Preencha as areas obrigatorias no PDF antes de enviar."
          : "Preencha as perguntas obrigatorias antes de enviar.",
      },
      ok: false,
      message: hasMissingInteractiveField
        ? "Preencha as areas obrigatorias no PDF antes de enviar."
        : "Preencha as perguntas obrigatorias antes de enviar.",
    };
  }

  const now = new Date();
  const autoCompleted =
    !evaluation.hasManualQuestions && evaluation.allObjectiveCorrect;
  const status = evaluation.hasManualQuestions
    ? "SUBMITTED"
    : autoCompleted
      ? "REVIEWED"
      : "RETURNED";
  const feedback = evaluation.hasManualQuestions
    ? null
    : autoCompleted
      ? `Concluido automaticamente. +${activity.xpReward} XP.`
      : "Revise as respostas objetivas e tente novamente.";
  const submission = await prisma.candyXpActivitySubmission.upsert({
    where: {
      activityId_studentProfileId: {
        activityId: activity.id,
        studentProfileId: studentProfile.id,
      },
    },
    create: {
      activityId: activity.id,
      answers,
      autoScorePercent: evaluation.autoScorePercent,
      feedback,
      reviewedAt: status === "REVIEWED" || status === "RETURNED" ? now : null,
      status,
      studentProfileId: studentProfile.id,
      submittedAt: now,
    },
    update: {
      answers,
      autoScorePercent: evaluation.autoScorePercent,
      feedback,
      reviewedAt: status === "REVIEWED" || status === "RETURNED" ? now : null,
      reviewedByUserId: null,
      status,
      submittedAt: now,
    },
    select: {
      id: true,
    },
  });

  if (autoCompleted) {
    await awardCandyXpActivity({
      activityId: activity.id,
      sourceKey: `student:candy-xp-activity:${submission.id}`,
      studentUserId: studentProfile.userId,
      submissionId: submission.id,
      xpReward: activity.xpReward,
    });
  }

  revalidatePath("/ava/student");
  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: autoCompleted
      ? `Missao concluida. +${activity.xpReward} XP.`
      : evaluation.hasManualQuestions
        ? "Atividade enviada para correcao."
        : "Algumas respostas precisam ser revisadas.",
  };
}

export async function reviewCandyXpActivitySubmission(
  input: CandyXpActivityReviewInput,
): Promise<CandyXpActivityActionResult<CandyXpActivityReviewInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para corrigir Candy XP.",
    };
  }

  const parsed = candyXpActivityReviewSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<CandyXpActivityReviewInput>(parsed.error.issues),
      ok: false,
      message: "Revise a correcao.",
    };
  }

  const prisma = getPrisma();
  const submission = await prisma.candyXpActivitySubmission.findUnique({
    where: {
      id: parsed.data.submissionId,
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
      studentProfile: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!submission) {
    return {
      ok: false,
      message: "Envio Candy XP nao encontrado.",
    };
  }

  const isApproved = parsed.data.outcome === "APPROVE";
  const now = new Date();

  await prisma.candyXpActivitySubmission.update({
    where: {
      id: submission.id,
    },
    data: {
      feedback:
        parsed.data.feedback ??
        (isApproved
          ? `Concluido. +${submission.activity.xpReward} XP.`
          : "Revise e envie novamente."),
      reviewedAt: now,
      reviewedByUserId: session.user.id,
      status: isApproved ? "REVIEWED" : "RETURNED",
    },
  });

  if (isApproved && !submission.awardedXp) {
    await awardCandyXpActivity({
      activityId: submission.activity.id,
      sourceKey: `student:candy-xp-activity:${submission.id}`,
      studentUserId: submission.studentProfile.userId,
      submissionId: submission.id,
      xpReward: submission.activity.xpReward,
    });
  }

  revalidatePath("/ava/admin");
  revalidatePath("/ava/student");

  return {
    ok: true,
    message: isApproved
      ? "Candy XP corrigido e XP liberado."
      : "Candy XP devolvido para o aluno refazer.",
  };
}
