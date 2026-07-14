"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { upsertCattyUserMemory } from "@/lib/catty-user-memory";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import {
  normalizePhoneDigits,
  preRegistrationAcceptSchema,
  preRegistrationReviewSchema,
  secretariaPreRegistrationSchema,
  type PreRegistrationAcceptInput,
  type PreRegistrationReviewInput,
  type SecretariaPreRegistrationInput,
} from "@/lib/validations/pre-registration";

export type PreRegistrationActionResult<TInput extends Record<string, unknown>> = {
  errors?: Partial<Record<keyof TInput, string>>;
  message: string;
  ok: boolean;
};

type ReviewerContext = {
  session: Session & {
    user: NonNullable<Session["user"]> & {
      id: string;
      role: "ADMIN" | "TEACHER";
    };
  };
  teacherProfileId: string | null;
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

async function requirePreRegistrationReviewer(): Promise<ReviewerContext | null> {
  const session = (await auth()) as Session | null;

  if (
    !session?.user?.id ||
    !isRole(session.user.role) ||
    !["ADMIN", "TEACHER"].includes(session.user.role)
  ) {
    return null;
  }

  const reviewerSession = session as ReviewerContext["session"];

  if (reviewerSession.user.role !== "TEACHER") {
    return {
      session: reviewerSession,
      teacherProfileId: null,
    };
  }

  const teacherProfile = await getPrisma().teacherProfile.findUnique({
    where: { userId: reviewerSession.user.id },
    select: { id: true },
  });

  return {
    session: reviewerSession,
    teacherProfileId: teacherProfile?.id ?? null,
  };
}

function canUsePreRegistration(
  context: ReviewerContext,
  request: {
    assignedTeacherProfileId: string | null;
    createdByUserId: string | null;
  },
) {
  if (context.session.user.role === "ADMIN") {
    return true;
  }

  return Boolean(
    context.teacherProfileId &&
      (request.assignedTeacherProfileId === context.teacherProfileId ||
        request.createdByUserId === context.session.user.id),
  );
}

function revalidatePreRegistrationPaths() {
  revalidatePath("/ava/admin");
  revalidatePath("/ava/teacher");
  revalidatePath("/ava/secretaria");
}

function formatWeekdayMask(mask: number | null | undefined) {
  if (!mask) {
    return null;
  }

  const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const selected = labels.filter((_, index) => (mask & (1 << index)) !== 0);

  return selected.length > 0 ? selected.join(", ") : null;
}

function buildStudentNotes(request: {
  city: string | null;
  englishGoal: string;
  estimatedLevel: string | null;
  intendedTime: string | null;
  intendedWeekdayMask: number;
  notes: string | null;
  secondaryContact: string | null;
  unit: "IVATE" | "DOURADINA";
}) {
  const schedule = [
    formatWeekdayMask(request.intendedWeekdayMask),
    request.intendedTime,
  ]
    .filter(Boolean)
    .join(" - ");

  return [
    request.notes ? `Observacoes do pre-cadastro: ${request.notes}` : null,
    `Objetivo com o ingles: ${request.englishGoal}`,
    request.estimatedLevel ? `Nivel estimado: ${request.estimatedLevel}` : null,
    request.city ? `Cidade/unidade: ${request.city} - ${request.unit}` : null,
    schedule ? `Horario pretendido: ${schedule}` : null,
    request.secondaryContact ? `Segundo contato: ${request.secondaryContact}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function createStudentPreRegistration(
  input: SecretariaPreRegistrationInput,
): Promise<PreRegistrationActionResult<SecretariaPreRegistrationInput>> {
  const context = await requirePreRegistrationReviewer();

  if (!context) {
    return {
      ok: false,
      message: "Voce nao tem permissao para criar pre-cadastros.",
    };
  }

  const parsed = secretariaPreRegistrationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<SecretariaPreRegistrationInput>(parsed.error.issues),
      ok: false,
      message: "Revise os dados do pre-cadastro.",
    };
  }

  const prisma = getPrisma();
  const phoneNormalized = normalizePhoneDigits(parsed.data.phone);
  let assignedTeacherProfileId = parsed.data.assignedTeacherProfileId ?? null;

  if (context.session.user.role === "TEACHER") {
    if (!context.teacherProfileId) {
      return {
        ok: false,
        message: "Perfil teacher nao encontrado para criar pre-cadastro.",
      };
    }

    if (
      assignedTeacherProfileId &&
      assignedTeacherProfileId !== context.teacherProfileId
    ) {
      return {
        errors: {
          assignedTeacherProfileId:
            "Teacher so pode assumir os proprios pre-cadastros.",
        },
        ok: false,
        message: "Revise a teacher responsavel.",
      };
    }

    assignedTeacherProfileId = context.teacherProfileId;
  }

  if (assignedTeacherProfileId) {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { id: assignedTeacherProfileId },
      select: { id: true },
    });

    if (!teacherProfile) {
      return {
        errors: {
          assignedTeacherProfileId: "Teacher responsavel nao encontrada.",
        },
        ok: false,
        message: "Revise a teacher responsavel.",
      };
    }
  }

  const duplicateFilters = [
    { phoneNormalized },
    { phone: parsed.data.phone },
    ...(parsed.data.email ? [{ email: parsed.data.email }] : []),
  ];
  const [existingRequest, existingUser] = await Promise.all([
    prisma.studentPreRegistration.findFirst({
      where: { OR: duplicateFilters },
      select: { email: true, fullName: true, id: true, phone: true },
    }),
    parsed.data.email
      ? prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: { id: true },
        })
      : null,
  ]);

  if (existingUser) {
    return {
      errors: {
        email: "Ja existe um usuario com este email.",
      },
      ok: false,
      message: "Ja existe um usuario com este email no AVA.",
    };
  }

  if (existingRequest) {
    return {
      errors: {
        phone: "Ja existe um pre-cadastro com este telefone ou email.",
      },
      ok: false,
      message: `Ja existe um pre-cadastro para ${existingRequest.fullName}.`,
    };
  }

  try {
    await prisma.studentPreRegistration.create({
      data: {
        assignedTeacherProfileId,
        birthDate: parsed.data.birthDate ?? null,
        city: parsed.data.city ?? null,
        createdByUserId: context.session.user.id,
        email: parsed.data.email ?? null,
        englishGoal: parsed.data.englishGoal,
        estimatedLevel: parsed.data.estimatedLevel ?? null,
        fullName: parsed.data.fullName,
        guardianName: parsed.data.guardianName ?? null,
        installmentsTotal: parsed.data.installmentsTotal ?? null,
        intendedTime: parsed.data.intendedTime ?? null,
        intendedWeekdayMask: parsed.data.intendedWeekdayMask,
        notes: parsed.data.notes ?? null,
        paymentDay: parsed.data.paymentDay ?? null,
        paymentMethod: parsed.data.paymentMethod ?? null,
        phone: parsed.data.phone,
        phoneNormalized,
        status: parsed.data.status,
        tuitionCents: parsed.data.tuitionAmount ?? null,
        unit: parsed.data.unit,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        errors: {
          phone: "Telefone ou email ja cadastrado.",
        },
        ok: false,
        message: "Este interessado ja esta cadastrado.",
      };
    }

    return {
      ok: false,
      message: "Nao foi possivel criar o pre-cadastro agora.",
    };
  }

  revalidatePreRegistrationPaths();

  return {
    ok: true,
    message: "Pre-cadastro salvo na Secretaria.",
  };
}

export async function updateStudentPreRegistrationStatus(
  input: PreRegistrationReviewInput,
): Promise<PreRegistrationActionResult<PreRegistrationReviewInput>> {
  const context = await requirePreRegistrationReviewer();

  if (!context) {
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
      assignedTeacherProfileId: true,
      createdByUserId: true,
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

  if (!canUsePreRegistration(context, request)) {
    return {
      ok: false,
      message: "Voce nao tem permissao para este pre-cadastro.",
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
      reviewedByUserId: context.session.user.id,
      status: parsed.data.status,
      statusNote: parsed.data.statusNote ?? null,
    },
  });

  revalidatePreRegistrationPaths();

  const statusMessages = {
    CONTACTED: "Pre-cadastro marcado como em conversa.",
    READY_TO_CONVERT: "Pre-cadastro marcado como pronto para virar aluno.",
    REJECTED: "Pre-cadastro recusado.",
    WAITING_PAYMENT: "Pre-cadastro marcado como aguardando pagamento.",
  };

  return {
    ok: true,
    message: statusMessages[parsed.data.status],
  };
}

export async function acceptStudentPreRegistration(
  input: PreRegistrationAcceptInput,
): Promise<PreRegistrationActionResult<PreRegistrationAcceptInput>> {
  const context = await requirePreRegistrationReviewer();

  if (!context) {
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
      message: "Revise os dados para aceitar o aluno.",
    };
  }

  const prisma = getPrisma();
  const passwordHash = await hash(parsed.data.initialPassword, 12);
  let createdUserId: string | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      const request = await tx.studentPreRegistration.findUnique({
        where: { id: parsed.data.requestId },
        select: {
          address: true,
          assignedTeacherProfileId: true,
          birthDate: true,
          city: true,
          createdByUserId: true,
          email: true,
          englishGoal: true,
          estimatedLevel: true,
          fullName: true,
          guardianDocument: true,
          guardianName: true,
          guardianPhone: true,
          id: true,
          intendedTime: true,
          intendedWeekdayMask: true,
          notes: true,
          phone: true,
          secondaryContact: true,
          status: true,
          studentPhone: true,
          unit: true,
        },
      });

      if (!request) {
        throw new Error("REQUEST_NOT_FOUND");
      }

      if (!canUsePreRegistration(context, request)) {
        throw new Error("REQUEST_FORBIDDEN");
      }

      if (
        ![
          "PENDING",
          "CONTACTED",
          "WAITING_PAYMENT",
          "READY_TO_CONVERT",
        ].includes(request.status)
      ) {
        throw new Error("REQUEST_NOT_ACCEPTABLE");
      }

      const emailForLogin = request.email ?? parsed.data.emailForLogin ?? null;

      if (!emailForLogin) {
        throw new Error("EMAIL_REQUIRED");
      }

      const existingUser = await tx.user.findUnique({
        where: { email: emailForLogin },
        select: { id: true },
      });

      if (existingUser) {
        throw new Error("USER_EMAIL_EXISTS");
      }

      const user = await tx.user.create({
        data: {
          address: request.address ?? request.city ?? undefined,
          email: emailForLogin,
          name: request.fullName,
          passwordHash,
          phone: request.studentPhone ?? request.phone,
          role: "STUDENT",
        },
      });
      createdUserId = user.id;

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

      const teacherProfileId =
        request.assignedTeacherProfileId ??
        (context.session.user.role === "TEACHER" ? context.teacherProfileId : null);

      if (teacherProfileId) {
        await tx.studentTeacherAssignment.upsert({
          where: {
            teacherProfileId_studentProfileId: {
              studentProfileId: studentProfile.id,
              teacherProfileId,
            },
          },
          create: {
            studentProfileId: studentProfile.id,
            teacherProfileId,
          },
          update: {},
        });
      }

      await tx.studentPreRegistration.update({
        where: { id: request.id },
        data: {
          convertedUserId: user.id,
          email: request.email ?? emailForLogin,
          reviewedAt: new Date(),
          reviewedByUserId: context.session.user.id,
          status: "APPROVED",
          statusNote: "Convertido em aluno STUDENT.",
        },
      });
    });
  } catch (error) {
    if (
      isUniqueConstraintError(error) ||
      (error as Error).message === "USER_EMAIL_EXISTS"
    ) {
      return {
        errors: {
          requestId: "Ja existe um usuario com este email.",
        },
        ok: false,
        message: "Ja existe um usuario com este email no AVA.",
      };
    }

    if ((error as Error).message === "EMAIL_REQUIRED") {
      return {
        errors: {
          requestId: "Informe um email antes de tornar aluno.",
        },
        ok: false,
        message: "Para criar login STUDENT, o pre-cadastro precisa ter email.",
      };
    }

    if ((error as Error).message === "REQUEST_FORBIDDEN") {
      return {
        ok: false,
        message: "Voce nao tem permissao para este pre-cadastro.",
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

    return {
      ok: false,
      message: "Nao foi possivel aceitar o aluno agora.",
    };
  }

  let message = "Aluno aceito e conta STUDENT criada com sucesso.";

  if (parsed.data.cattyContext && createdUserId) {
    const source =
      context.session.user.role === "ADMIN" ? "ADMIN_NOTE" : "TEACHER_NOTE";
    const memoryResult = await upsertCattyUserMemory({
      actorRole: context.session.user.role,
      actorUserId: context.session.user.id,
      category: "NOTE",
      confidence: 90,
      key: "contexto_catty",
      source,
      status: "ACTIVE",
      targetUserId: createdUserId,
      value: parsed.data.cattyContext,
    });

    if (!memoryResult.ok) {
      message =
        "Aluno aceito, mas o contexto Catty nao foi salvo. Revise em Memoria da Catty.";
    } else {
      message = "Aluno aceito com contexto Catty inicial.";
    }
  }

  revalidatePreRegistrationPaths();

  return {
    ok: true,
    message,
  };
}
