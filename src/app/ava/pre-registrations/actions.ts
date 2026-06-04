"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import {
  preRegistrationAcceptSchema,
  preRegistrationReviewSchema,
  type PreRegistrationAcceptInput,
  type PreRegistrationReviewInput,
} from "@/lib/validations/pre-registration";

export type PreRegistrationActionResult<TInput extends Record<string, unknown>> = {
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

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

async function requirePreRegistrationReviewer() {
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

function buildStudentNotes(request: {
  englishGoal: string;
  notes: string | null;
  secondaryContact: string | null;
}) {
  return [
    request.notes ? `Observacoes do pre-cadastro: ${request.notes}` : null,
    `Objetivo com o ingles: ${request.englishGoal}`,
    request.secondaryContact ? `Segundo contato: ${request.secondaryContact}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function updateStudentPreRegistrationStatus(
  input: PreRegistrationReviewInput,
): Promise<PreRegistrationActionResult<PreRegistrationReviewInput>> {
  const session = await requirePreRegistrationReviewer();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para revisar pre-cadastros.",
    };
  }

  const parsed = preRegistrationReviewSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<PreRegistrationReviewInput>(parsed.error.issues),
      ok: false,
      message: "Revise os dados da solicitacao.",
    };
  }

  const prisma = getPrisma();
  const request = await prisma.studentPreRegistration.findUnique({
    where: { id: parsed.data.requestId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!request) {
    return {
      ok: false,
      message: "Solicitacao nao encontrada.",
    };
  }

  if (request.status === "APPROVED") {
    return {
      ok: false,
      message: "Esta solicitacao ja foi convertida em aluno.",
    };
  }

  await prisma.studentPreRegistration.update({
    where: { id: request.id },
    data: {
      reviewedAt: new Date(),
      reviewedByUserId: session.user.id,
      status: parsed.data.status,
      statusNote: parsed.data.statusNote ?? null,
    },
  });

  revalidatePath("/ava/admin");
  revalidatePath("/ava/teacher");

  return {
    ok: true,
    message:
      parsed.data.status === "CONTACTED"
        ? "Solicitacao marcada como em analise."
        : "Solicitacao recusada.",
  };
}

export async function acceptStudentPreRegistration(
  input: PreRegistrationAcceptInput,
): Promise<PreRegistrationActionResult<PreRegistrationAcceptInput>> {
  const session = await requirePreRegistrationReviewer();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para aceitar alunos.",
    };
  }

  const parsed = preRegistrationAcceptSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<PreRegistrationAcceptInput>(parsed.error.issues),
      ok: false,
      message: "Revise a senha inicial.",
    };
  }

  const prisma = getPrisma();
  const passwordHash = await hash(parsed.data.initialPassword, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const request = await tx.studentPreRegistration.findUnique({
        where: { id: parsed.data.requestId },
        select: {
          address: true,
          birthDate: true,
          email: true,
          englishGoal: true,
          fullName: true,
          guardianDocument: true,
          guardianName: true,
          guardianPhone: true,
          id: true,
          notes: true,
          phone: true,
          secondaryContact: true,
          status: true,
          studentPhone: true,
        },
      });

      if (!request) {
        throw new Error("REQUEST_NOT_FOUND");
      }

      if (!["PENDING", "CONTACTED"].includes(request.status)) {
        throw new Error("REQUEST_NOT_ACCEPTABLE");
      }

      const existingUser = await tx.user.findUnique({
        where: { email: request.email },
        select: { id: true },
      });

      if (existingUser) {
        throw new Error("USER_EMAIL_EXISTS");
      }

      const user = await tx.user.create({
        data: {
          address: request.address ?? undefined,
          email: request.email,
          name: request.fullName,
          passwordHash,
          phone: request.studentPhone ?? request.phone,
          role: "STUDENT",
        },
      });

      const studentProfile = await tx.studentProfile.create({
        data: {
          birthDate: request.birthDate,
          guardianDocument: request.guardianDocument,
          motherName: request.guardianName,
          motherPhone: request.guardianPhone,
          notes: buildStudentNotes(request),
          studentPhone: request.studentPhone ?? request.phone,
          studentPhoneAlt: request.secondaryContact,
          userId: user.id,
        },
      });

      if (session.user.role === "TEACHER") {
        const teacherProfile = await tx.teacherProfile.findUnique({
          where: { userId: session.user.id },
          select: { id: true },
        });

        if (!teacherProfile) {
          throw new Error("TEACHER_PROFILE_NOT_FOUND");
        }

        await tx.studentTeacherAssignment.upsert({
          where: {
            teacherProfileId_studentProfileId: {
              studentProfileId: studentProfile.id,
              teacherProfileId: teacherProfile.id,
            },
          },
          create: {
            studentProfileId: studentProfile.id,
            teacherProfileId: teacherProfile.id,
          },
          update: {},
        });
      }

      await tx.studentPreRegistration.update({
        where: { id: request.id },
        data: {
          convertedUserId: user.id,
          reviewedAt: new Date(),
          reviewedByUserId: session.user.id,
          status: "APPROVED",
          statusNote: "Convertido em aluno STUDENT.",
        },
      });
    });
  } catch (error) {
    if (isUniqueConstraintError(error) || (error as Error).message === "USER_EMAIL_EXISTS") {
      return {
        errors: {
          requestId: "Ja existe um usuario com este email.",
        },
        ok: false,
        message: "Ja existe um usuario com este email no AVA.",
      };
    }

    if ((error as Error).message === "REQUEST_NOT_FOUND") {
      return {
        ok: false,
        message: "Solicitacao nao encontrada.",
      };
    }

    if ((error as Error).message === "REQUEST_NOT_ACCEPTABLE") {
      return {
        ok: false,
        message: "Esta solicitacao nao pode mais ser aceita.",
      };
    }

    if ((error as Error).message === "TEACHER_PROFILE_NOT_FOUND") {
      return {
        ok: false,
        message: "Perfil teacher nao encontrado para vincular o aluno.",
      };
    }

    return {
      ok: false,
      message: "Nao foi possivel aceitar o aluno agora.",
    };
  }

  revalidatePath("/ava/admin");
  revalidatePath("/ava/teacher");

  return {
    ok: true,
    message: "Aluno aceito e conta STUDENT criada com sucesso.",
  };
}
