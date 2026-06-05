"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  buildCattyResponsePlan,
  type CattyPageContext,
  type CattySessionContext,
} from "@/lib/catty";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import {
  cattyLearningFeedbackCreateSchema,
  cattyLearningFeedbackStatusUpdateSchema,
  cattyLearningFromFeedbackSchema,
  cattyLearningCreateSchema,
  cattyLearningStatusUpdateSchema,
  type CattyLearningCreateInput,
  type CattyLearningFeedbackCreateInput,
  type CattyLearningFeedbackKindInput,
  type CattyLearningFeedbackStatusUpdateInput,
  type CattyLearningFromFeedbackInput,
  type CattyLearningStatusInput,
  type CattyLearningStatusUpdateInput,
  hasSensitiveCattyLearningText,
} from "@/lib/validations/catty-learning";

export type CattyLearningActionResult<
  TInput extends Record<string, unknown>,
> = {
  errors?: Partial<Record<keyof TInput, string>>;
  message: string;
  ok: boolean;
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

async function requireCattyLearningContributor() {
  const session = await auth();

  if (
    !session?.user?.id ||
    !isRole(session.user.role) ||
    !["ADMIN", "TEACHER"].includes(session.user.role)
  ) {
    return null;
  }

  return session;
}

async function requireCattyFeedbackUser() {
  const session = await auth();

  if (!session?.user?.id || !isRole(session.user.role)) {
    return null;
  }

  return session;
}

async function requireCattyLearningAdmin() {
  const session = await auth();

  if (
    !session?.user?.id ||
    !isRole(session.user.role) ||
    session.user.role !== "ADMIN"
  ) {
    return null;
  }

  return session;
}

function revalidateCattyLearning() {
  revalidatePath("/ava/admin");
  revalidatePath("/ava/teacher");
}

function normalizeFeedbackText(text: string, maxLength: number) {
  return text.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function buildFeedbackNote(kind: CattyLearningFeedbackKindInput, note?: string) {
  if (note) {
    return note;
  }

  const notes = {
    CONFUSING: "Resposta confusa.",
    DISLIKED: "Nao gostei da resposta da Catty.",
    LIKED: "Gostei da resposta da Catty.",
    PATTERN_SUGGESTION: "Sugestao de padrao para a Catty.",
    SHOULD_ANSWER: "Sugestao de resposta ideal.",
  } satisfies Record<CattyLearningFeedbackKindInput, string>;

  return notes[kind];
}

function categoryFromFeedbackKind(kind: CattyLearningFeedbackKindInput) {
  if (kind === "DISLIKED" || kind === "CONFUSING") {
    return "BAD_REPLY" as const;
  }

  return "IDEAL_REPLY" as const;
}

function titleFromFeedback(input: {
  kind: CattyLearningFeedbackKindInput;
  prompt?: string | null;
}) {
  const prefix = {
    CONFUSING: "Resposta confusa",
    DISLIKED: "Resposta ruim",
    LIKED: "Boa resposta",
    PATTERN_SUGGESTION: "Padrao sugerido",
    SHOULD_ANSWER: "Resposta ideal sugerida",
  } satisfies Record<CattyLearningFeedbackKindInput, string>;
  const compactPrompt = input.prompt
    ? normalizeFeedbackText(input.prompt, 54)
    : "";

  return compactPrompt
    ? `${prefix[input.kind]}: ${compactPrompt}`
    : prefix[input.kind];
}

function contextFromStoredValues(input: {
  area?: string | null;
  task?: string | null;
}): CattyPageContext {
  const allowedAreas = ["admin", "teacher", "student", "site", "login", "unknown"];
  const area = allowedAreas.includes(input.area ?? "")
    ? (input.area as CattyPageContext["area"])
    : "unknown";

  return {
    area,
    task: input.task ?? undefined,
  };
}

function sessionContextForRole(role: CattySessionContext["role"]) {
  return {
    role,
  } satisfies CattySessionContext;
}

async function getTeacherProfileId(userId: string) {
  const prisma = getPrisma();
  const profile = await prisma.teacherProfile.findUnique({
    select: {
      id: true,
    },
    where: {
      userId,
    },
  });

  return profile?.id ?? null;
}

async function canAccessFeedback(input: {
  feedbackId: string;
  userId: string;
  userRole: "ADMIN" | "TEACHER" | "STUDENT";
}) {
  if (input.userRole === "ADMIN") {
    return true;
  }

  const prisma = getPrisma();
  const feedback = await prisma.cattyLearningFeedback.findUnique({
    select: {
      createdByUserId: true,
      createdByUser: {
        select: {
          studentProfile: {
            select: {
              teacherAssignments: {
                select: {
                  teacherProfileId: true,
                },
              },
            },
          },
        },
      },
    },
    where: {
      id: input.feedbackId,
    },
  });

  if (!feedback) {
    return false;
  }

  if (feedback.createdByUserId === input.userId) {
    return true;
  }

  if (input.userRole !== "TEACHER") {
    return false;
  }

  const teacherProfileId = await getTeacherProfileId(input.userId);

  if (!teacherProfileId) {
    return false;
  }

  return (
    feedback.createdByUser?.studentProfile?.teacherAssignments.some(
      (assignment) => assignment.teacherProfileId === teacherProfileId,
    ) ?? false
  );
}

export async function createCattyLearningItem(
  input: CattyLearningCreateInput,
): Promise<CattyLearningActionResult<CattyLearningCreateInput>> {
  const session = await requireCattyLearningContributor();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para sugerir aprendizados da Catty.",
    };
  }

  const parsed = cattyLearningCreateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<CattyLearningCreateInput>(parsed.error.issues),
      ok: false,
      message: "Revise o aprendizado antes de salvar.",
    };
  }

  const prisma = getPrisma();

  await prisma.cattyLearningItem.create({
    data: {
      badReply: parsed.data.badReply ?? null,
      category: parsed.data.category,
      createdByUserId: session.user.id,
      idealReply: parsed.data.idealReply ?? null,
      intent: parsed.data.intent ?? null,
      notes: parsed.data.notes ?? null,
      status: "PENDING",
      tags: parsed.data.tags,
      title: parsed.data.title,
      userPrompt: parsed.data.userPrompt ?? null,
    },
  });

  revalidateCattyLearning();

  return {
    ok: true,
    message:
      session.user.role === "ADMIN"
        ? "Aprendizado salvo como pendente para revisao final."
        : "Sugestao enviada. Um admin precisa aprovar antes da Catty usar.",
  };
}

export async function updateCattyLearningItemStatus(
  input: CattyLearningStatusUpdateInput,
): Promise<CattyLearningActionResult<CattyLearningStatusUpdateInput>> {
  const session = await requireCattyLearningAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Somente ADMIN pode aprovar aprendizados globais da Catty.",
    };
  }

  const parsed = cattyLearningStatusUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<CattyLearningStatusUpdateInput>(parsed.error.issues),
      ok: false,
      message: "Status invalido para o aprendizado.",
    };
  }

  const prisma = getPrisma();
  const approved = parsed.data.status === "APPROVED";

  await prisma.cattyLearningItem.update({
    where: {
      id: parsed.data.itemId,
    },
    data: {
      approvedAt: approved ? new Date() : null,
      approvedByUserId: approved ? session.user.id : null,
      status: parsed.data.status,
    },
  });

  revalidateCattyLearning();

  const messages = {
    APPROVED: "Aprendizado aprovado e liberado para a Catty.",
    ARCHIVED: "Aprendizado arquivado.",
    PENDING: "Aprendizado voltou para pendente.",
    REJECTED: "Aprendizado recusado.",
  } satisfies Record<CattyLearningStatusInput, string>;

  return {
    ok: true,
    message: messages[parsed.data.status],
  };
}

export async function submitCattyReplyFeedback(
  input: CattyLearningFeedbackCreateInput,
): Promise<CattyLearningActionResult<CattyLearningFeedbackCreateInput>> {
  const session = await requireCattyFeedbackUser();

  if (!session) {
    return {
      ok: false,
      message: "Entre no AVA para avaliar respostas da Catty.",
    };
  }

  const parsed = cattyLearningFeedbackCreateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<CattyLearningFeedbackCreateInput>(parsed.error.issues),
      ok: false,
      message: "Revise o feedback antes de enviar.",
    };
  }

  const prisma = getPrisma();
  const cattyMessage = await prisma.cattyMessage.findUnique({
    select: {
      conversation: {
        select: {
          area: true,
          contextKey: true,
          id: true,
          task: true,
          userId: true,
        },
      },
      createdAt: true,
      id: true,
      role: true,
      text: true,
    },
    where: {
      id: parsed.data.cattyMessageId,
    },
  });

  if (
    !cattyMessage ||
    cattyMessage.role !== "CATTY" ||
    cattyMessage.conversation.userId !== session.user.id
  ) {
    return {
      ok: false,
      message: "Nao consegui localizar essa resposta da Catty para avaliar.",
    };
  }

  const previousUserMessage = await prisma.cattyMessage.findFirst({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      text: true,
    },
    where: {
      conversationId: cattyMessage.conversation.id,
      createdAt: {
        lte: cattyMessage.createdAt,
      },
      role: "USER",
    },
  });
  const userPrompt = previousUserMessage?.text
    ? normalizeFeedbackText(previousUserMessage.text, 500)
    : null;
  const cattyReply = normalizeFeedbackText(cattyMessage.text, 700);
  const idealReply = parsed.data.idealReply
    ? normalizeFeedbackText(parsed.data.idealReply, 1000)
    : null;
  const sensitiveContent = [userPrompt, cattyReply, idealReply, parsed.data.note]
    .filter(Boolean)
    .join(" ");

  if (hasSensitiveCattyLearningText(sensitiveContent)) {
    return {
      ok: false,
      message:
        "Nao salvei esse feedback porque ele parece conter dado sensivel. Chame a equipe Candy se precisar.",
    };
  }

  const pageContext = contextFromStoredValues(cattyMessage.conversation);
  const responsePlan = buildCattyResponsePlan(
    userPrompt ?? cattyReply,
    pageContext,
    [],
    sessionContextForRole(session.user.role),
  );
  const suggestedCategory = categoryFromFeedbackKind(parsed.data.kind);

  await prisma.cattyLearningFeedback.create({
    data: {
      cattyMessageId: cattyMessage.id,
      cattyReply,
      contextArea: cattyMessage.conversation.area,
      contextKey: cattyMessage.conversation.contextKey,
      contextTask: cattyMessage.conversation.task,
      createdByUserId: session.user.id,
      idealReply:
        idealReply ??
        (parsed.data.kind === "LIKED" ? cattyReply : null),
      kind: parsed.data.kind,
      note: buildFeedbackNote(parsed.data.kind, parsed.data.note),
      status: "PENDING",
      suggestedCategory,
      suggestedIntent: responsePlan.intent,
      suggestedTitle: titleFromFeedback({
        kind: parsed.data.kind,
        prompt: userPrompt,
      }),
      userPrompt,
    },
  });

  revalidateCattyLearning();

  return {
    ok: true,
    message:
      parsed.data.kind === "LIKED"
        ? "Miauw, feedback recebido. A Catty ficou feliz."
        : "Feedback recebido. Ele entrou na fila de treino da Catty.",
  };
}

export async function updateCattyLearningFeedbackStatus(
  input: CattyLearningFeedbackStatusUpdateInput,
): Promise<CattyLearningActionResult<CattyLearningFeedbackStatusUpdateInput>> {
  const session = await requireCattyLearningContributor();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para revisar feedbacks da Catty.",
    };
  }

  const parsed = cattyLearningFeedbackStatusUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<CattyLearningFeedbackStatusUpdateInput>(
        parsed.error.issues,
      ),
      ok: false,
      message: "Status invalido para o feedback.",
    };
  }

  if (
    parsed.data.status === "APPROVED" &&
    session.user.role !== "ADMIN"
  ) {
    return {
      ok: false,
      message: "Somente ADMIN aprova aprendizado global da Catty.",
    };
  }

  const hasAccess = await canAccessFeedback({
    feedbackId: parsed.data.feedbackId,
    userId: session.user.id,
    userRole: session.user.role,
  });

  if (!hasAccess) {
    return {
      ok: false,
      message: "Voce nao tem permissao para revisar esse feedback.",
    };
  }

  const prisma = getPrisma();

  await prisma.cattyLearningFeedback.update({
    data: {
      reviewedAt: new Date(),
      reviewedByUserId: session.user.id,
      status: parsed.data.status,
    },
    where: {
      id: parsed.data.feedbackId,
    },
  });

  revalidateCattyLearning();

  const messages = {
    APPROVED: "Feedback marcado como aprovado.",
    ARCHIVED: "Feedback arquivado.",
    PENDING: "Feedback voltou para pendente.",
    REJECTED: "Feedback recusado.",
  } satisfies Record<CattyLearningStatusInput, string>;

  return {
    ok: true,
    message: messages[parsed.data.status],
  };
}

export async function createCattyLearningFromFeedback(
  input: CattyLearningFromFeedbackInput,
): Promise<CattyLearningActionResult<CattyLearningFromFeedbackInput>> {
  const session = await requireCattyLearningContributor();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para treinar a Catty.",
    };
  }

  const parsed = cattyLearningFromFeedbackSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<CattyLearningFromFeedbackInput>(parsed.error.issues),
      ok: false,
      message: "Revise o aprendizado antes de aprovar.",
    };
  }

  const hasAccess = await canAccessFeedback({
    feedbackId: parsed.data.feedbackId,
    userId: session.user.id,
    userRole: session.user.role,
  });

  if (!hasAccess) {
    return {
      ok: false,
      message: "Voce nao tem permissao para usar esse feedback.",
    };
  }

  const prisma = getPrisma();
  const approved = session.user.role === "ADMIN";

  await prisma.$transaction(async (tx) => {
    const feedback = await tx.cattyLearningFeedback.findUnique({
      select: {
        itemId: true,
      },
      where: {
        id: parsed.data.feedbackId,
      },
    });
    const learningData = {
      approvedAt: approved ? new Date() : null,
      approvedByUserId: approved ? session.user.id : null,
      badReply: parsed.data.badReply ?? null,
      category: parsed.data.category,
      idealReply: parsed.data.idealReply ?? null,
      intent: parsed.data.intent ?? null,
      notes: parsed.data.notes ?? null,
      status: approved ? "APPROVED" : "PENDING",
      tags: parsed.data.tags,
      title: parsed.data.title,
      userPrompt: parsed.data.userPrompt ?? null,
    } as const;
    const learningItem = feedback?.itemId
      ? await tx.cattyLearningItem.update({
          data: learningData,
          select: {
            id: true,
          },
          where: {
            id: feedback.itemId,
          },
        })
      : await tx.cattyLearningItem.create({
          data: {
            ...learningData,
            createdByUserId: session.user.id,
          },
          select: {
            id: true,
          },
        });

    await tx.cattyLearningFeedback.update({
      data: {
        itemId: learningItem.id,
        reviewedAt: new Date(),
        reviewedByUserId: session.user.id,
        status: approved ? "APPROVED" : "PENDING",
      },
      where: {
        id: parsed.data.feedbackId,
      },
    });
  });

  revalidateCattyLearning();

  return {
    ok: true,
    message: approved
      ? "Feedback aprovado e liberado como aprendizado da Catty."
      : "Sugestao criada. Um admin precisa aprovar antes da Catty usar.",
  };
}
