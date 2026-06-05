"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import {
  cattyLearningCreateSchema,
  cattyLearningStatusUpdateSchema,
  type CattyLearningCreateInput,
  type CattyLearningStatusInput,
  type CattyLearningStatusUpdateInput,
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
