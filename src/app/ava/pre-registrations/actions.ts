"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { upsertCattyUserMemory } from "@/lib/catty-user-memory";
import { isOpenPreRegistrationStatus } from "@/lib/pre-registration-queue";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import {
  normalizePhoneDigits,
  preRegistrationAcceptSchema,
  preRegistrationReviewSchema,
  secretariaPreRegistrationSchema,
  secretariaPreRegistrationUpdateSchema,
  type PreRegistrationAcceptInput,
  type PreRegistrationReviewInput,
  type SecretariaPreRegistrationInput,
  type SecretariaPreRegistrationUpdateInput,
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

const CONVERSION_YEAR = 2026;
const FINANCE_YEAR_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const agendaTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

type FinancialSnapshotSource = {
  address: string | null;
  amountCents: number;
  cpf: string | null;
  email: string | null;
  installmentsTotal: number | null;
  name: string;
  paymentDay: number;
  paymentMethod: string;
  phone: string | null;
  unit: "IVATE" | "DOURADINA";
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

function decodeWeekdayMask(mask: number) {
  return Array.from({ length: 7 }, (_, index) => index).filter(
    (weekday) => (mask & (1 << weekday)) !== 0,
  );
}

function getConversionStartMonth(date = new Date()) {
  return date.getFullYear() === CONVERSION_YEAR ? date.getMonth() + 1 : 1;
}

function getFinanceMonthsFrom(month: number) {
  return FINANCE_YEAR_MONTHS.filter((candidateMonth) => candidateMonth >= month);
}

function getFinanceMonthsForPlan(month: number, installmentsTotal?: number | null) {
  if (!installmentsTotal) {
    return getFinanceMonthsFrom(month);
  }

  const lastMonth = Math.min(12, month + installmentsTotal - 1);

  return FINANCE_YEAR_MONTHS.filter(
    (candidateMonth) => candidateMonth >= month && candidateMonth <= lastMonth,
  );
}

function getFinancialInstallmentNumber(
  month: number,
  startMonth: number,
  installmentsTotal?: number | null,
) {
  if (!installmentsTotal) {
    return null;
  }

  const installmentNumber = month - startMonth + 1;

  return installmentNumber >= 1 && installmentNumber <= installmentsTotal
    ? installmentNumber
    : null;
}

function buildFinancialPaymentSnapshot(
  student: FinancialSnapshotSource,
  installmentNumber?: number | null,
) {
  return {
    snapshotAddress: student.address,
    snapshotAmountCents: student.amountCents,
    snapshotCpf: student.cpf,
    snapshotEmail: student.email,
    snapshotInstallmentNumber: installmentNumber ?? null,
    snapshotInstallmentsTotal: student.installmentsTotal,
    snapshotName: student.name,
    snapshotPaymentDay: student.paymentDay,
    snapshotPaymentMethod: student.paymentMethod,
    snapshotPhone: student.phone,
    snapshotUnit: student.unit,
  };
}

function getAgendaDateParts(date: Date) {
  return {
    month: date.getUTCMonth() + 1,
    weekday: date.getUTCDay(),
    year: date.getUTCFullYear(),
  };
}

function getAgendaRecurringDates(startMonth: number, weekdays: number[]) {
  const selectedWeekdays = new Set(weekdays);
  const dates: Date[] = [];

  for (let month = startMonth; month <= 12; month += 1) {
    const lastDay = new Date(Date.UTC(CONVERSION_YEAR, month, 0)).getUTCDate();

    for (let day = 1; day <= lastDay; day += 1) {
      const date = new Date(Date.UTC(CONVERSION_YEAR, month - 1, day, 12));

      if (selectedWeekdays.has(date.getUTCDay())) {
        dates.push(date);
      }
    }
  }

  return dates;
}

function mapPreRegistrationPaymentMethod(method: string) {
  const methodMap: Record<string, string> = {
    CARTAO: "CREDIT_CARD",
    DINHEIRO: "CASH",
    OUTRO: "OTHER",
    PIX: "PIX",
  };

  return methodMap[method] ?? "OTHER";
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
        status: "PENDING",
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

export async function updateStudentPreRegistration(
  input: SecretariaPreRegistrationUpdateInput,
): Promise<
  PreRegistrationActionResult<SecretariaPreRegistrationUpdateInput>
> {
  const context = await requirePreRegistrationReviewer();

  if (!context) {
    return {
      ok: false,
      message: "Voce nao tem permissao para editar pre-cadastros.",
    };
  }

  const parsed = secretariaPreRegistrationUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<SecretariaPreRegistrationUpdateInput>(
        parsed.error.issues,
      ),
      ok: false,
      message: "Revise os dados do pre-cadastro.",
    };
  }

  const prisma = getPrisma();
  const request = await prisma.studentPreRegistration.findUnique({
    where: { id: parsed.data.requestId },
    select: {
      assignedTeacherProfileId: true,
      convertedAgendaStudentId: true,
      convertedFinancialStudentId: true,
      convertedStudentProfileId: true,
      convertedUserId: true,
      createdByUserId: true,
      id: true,
      status: true,
    },
  });

  if (!request) {
    return {
      ok: false,
      message: "Pre-cadastro nao encontrado.",
    };
  }

  if (!canUsePreRegistration(context, request)) {
    return {
      ok: false,
      message: "Voce nao tem permissao para editar este pre-cadastro.",
    };
  }

  if (
    !isOpenPreRegistrationStatus(request.status) ||
    request.convertedUserId ||
    request.convertedStudentProfileId ||
    request.convertedFinancialStudentId ||
    request.convertedAgendaStudentId
  ) {
    return {
      ok: false,
      message:
        "Este pre-cadastro ja saiu da fila Novo e nao pode mais ser editado.",
    };
  }

  let assignedTeacherProfileId =
    parsed.data.assignedTeacherProfileId ?? null;

  if (context.session.user.role === "TEACHER") {
    if (!context.teacherProfileId) {
      return {
        ok: false,
        message: "Perfil teacher nao encontrado para editar pre-cadastro.",
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

  const phoneNormalized = normalizePhoneDigits(parsed.data.phone);
  const duplicateFilters = [
    { phoneNormalized },
    { phone: parsed.data.phone },
    ...(parsed.data.email ? [{ email: parsed.data.email }] : []),
  ];
  const [existingRequest, existingUser] = await Promise.all([
    prisma.studentPreRegistration.findFirst({
      where: {
        id: { not: request.id },
        OR: duplicateFilters,
      },
      select: { fullName: true },
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
        phone: "Ja existe outro pre-cadastro com este telefone ou email.",
      },
      ok: false,
      message: `Ja existe um pre-cadastro para ${existingRequest.fullName}.`,
    };
  }

  try {
    await prisma.studentPreRegistration.update({
      where: { id: request.id },
      data: {
        assignedTeacherProfileId,
        birthDate: parsed.data.birthDate ?? null,
        city: parsed.data.city ?? null,
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
        reviewedAt: new Date(),
        reviewedByUserId: context.session.user.id,
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
      message: "Nao foi possivel atualizar o pre-cadastro agora.",
    };
  }

  revalidatePreRegistrationPaths();

  return {
    ok: true,
    message: "Pre-cadastro atualizado com sucesso.",
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
  let postConversionMessage = "Aluno convertido com AVA, financeiro e agenda criados.";

  try {
    await prisma.$transaction(async (tx) => {
      const request = await tx.studentPreRegistration.findUnique({
        where: { id: parsed.data.requestId },
        select: {
          address: true,
          assignedTeacherProfileId: true,
          birthDate: true,
          city: true,
          convertedAgendaStudentId: true,
          convertedFinancialStudentId: true,
          convertedStudentProfileId: true,
          convertedUserId: true,
          createdByUserId: true,
          email: true,
          englishGoal: true,
          estimatedLevel: true,
          fullName: true,
          guardianDocument: true,
          guardianName: true,
          guardianPhone: true,
          id: true,
          installmentsTotal: true,
          intendedTime: true,
          intendedWeekdayMask: true,
          notes: true,
          paymentDay: true,
          paymentMethod: true,
          phone: true,
          secondaryContact: true,
          status: true,
          studentPhone: true,
          tuitionCents: true,
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
        request.convertedUserId ||
        request.convertedStudentProfileId ||
        request.convertedFinancialStudentId ||
        request.convertedAgendaStudentId
      ) {
        throw new Error("REQUEST_ALREADY_CONVERTED");
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

      const emailForLogin = parsed.data.emailForLogin;

      if (
        !request.tuitionCents ||
        request.tuitionCents <= 0 ||
        !request.paymentDay ||
        !request.paymentMethod
      ) {
        throw new Error("FINANCE_REQUIRED");
      }

      const agendaWeekdays = decodeWeekdayMask(request.intendedWeekdayMask);
      const hasCompleteAgendaData = Boolean(
        agendaWeekdays.length > 0 &&
          request.intendedTime &&
          agendaTimePattern.test(request.intendedTime),
      );

      if (!hasCompleteAgendaData && !parsed.data.confirmMissingAgendaData) {
        throw new Error("AGENDA_CONFIRMATION_REQUIRED");
      }
      const intendedTime = hasCompleteAgendaData ? request.intendedTime : null;

      let teacherProfileId: string | null = null;

      if (context.session.user.role === "TEACHER") {
        if (!context.teacherProfileId) {
          throw new Error("TEACHER_PROFILE_REQUIRED");
        }

        if (
          request.assignedTeacherProfileId &&
          request.assignedTeacherProfileId !== context.teacherProfileId
        ) {
          throw new Error("REQUEST_FORBIDDEN");
        }

        teacherProfileId = context.teacherProfileId;
      } else {
        teacherProfileId =
          parsed.data.teacherProfileIdForConversion ??
          request.assignedTeacherProfileId ??
          null;
      }

      if (teacherProfileId) {
        const teacherProfile = await tx.teacherProfile.findUnique({
          where: { id: teacherProfileId },
          select: { id: true },
        });

        if (!teacherProfile) {
          throw new Error("TEACHER_NOT_FOUND");
        }
      }

      const existingUser = await tx.user.findUnique({
        where: { email: emailForLogin },
        select: { id: true },
      });

      if (existingUser) {
        throw new Error("USER_EMAIL_EXISTS");
      }

      const existingPreRegistration = await tx.studentPreRegistration.findFirst({
        where: {
          email: emailForLogin,
          NOT: {
            id: request.id,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingPreRegistration) {
        throw new Error("PRE_REGISTRATION_EMAIL_EXISTS");
      }

      const contactPhone = request.studentPhone ?? request.phone;
      const [existingPhoneUser, existingFinancialStudent] = await Promise.all([
        tx.user.findFirst({
          where: {
            OR: [
              { phone: contactPhone },
              { studentProfile: { studentPhone: contactPhone } },
            ],
          },
          select: { id: true },
        }),
        tx.financialStudent.findFirst({
          where: {
            OR: [{ phone: contactPhone }, { email: emailForLogin }],
          },
          select: { id: true },
        }),
      ]);
      const existingAgendaLesson =
        hasCompleteAgendaData && intendedTime
          ? await tx.agendaLesson.findFirst({
              where: {
                isActive: true,
                isMakeup: false,
                time: intendedTime,
                weekday: {
                  in: agendaWeekdays,
                },
                year: CONVERSION_YEAR,
                student: {
                  name: {
                    equals: request.fullName,
                    mode: "insensitive",
                  },
                },
              },
              select: { id: true },
            })
          : null;

      if (existingPhoneUser) {
        throw new Error("USER_PHONE_EXISTS");
      }

      if (existingFinancialStudent) {
        throw new Error("FINANCIAL_DUPLICATE");
      }

      if (existingAgendaLesson) {
        throw new Error("AGENDA_DUPLICATE");
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

      const financialStudent = await tx.financialStudent.create({
        data: {
          address: request.address ?? request.city,
          amountCents: request.tuitionCents,
          cpf: null,
          email: emailForLogin,
          installmentsTotal: request.installmentsTotal,
          name: request.fullName,
          paymentDay: request.paymentDay,
          paymentMethod: mapPreRegistrationPaymentMethod(request.paymentMethod),
          phone: contactPhone,
          unit: request.unit,
        },
      });
      const conversionMonth = getConversionStartMonth();
      const financeMonths = getFinanceMonthsForPlan(
        conversionMonth,
        financialStudent.installmentsTotal,
      );

      await tx.financialPayment.createMany({
        data: financeMonths.map((month) => ({
          ...buildFinancialPaymentSnapshot(
            financialStudent,
            getFinancialInstallmentNumber(
              month,
              conversionMonth,
              financialStudent.installmentsTotal,
            ),
          ),
          isActive: true,
          isPaid: false,
          month,
          note:
            month === conversionMonth
              ? "Criado a partir do pre-cadastro da Secretaria."
              : null,
          paidAt: null,
          studentId: financialStudent.id,
          year: CONVERSION_YEAR,
        })),
      });

      const firstPayment = await tx.financialPayment.findUnique({
        where: {
          studentId_year_month: {
            month: conversionMonth,
            studentId: financialStudent.id,
            year: CONVERSION_YEAR,
          },
        },
        select: { id: true },
      });

      await tx.financialLog.create({
        data: {
          action: "CREATE_FROM_PRE_REGISTRATION",
          createdByUserId: context.session.user.id,
          description: `Aluno financeiro criado a partir do pre-cadastro: ${financialStudent.name}.`,
          paymentId: firstPayment?.id,
          studentId: financialStudent.id,
        },
      });

      const agendaDates =
        hasCompleteAgendaData && intendedTime
          ? getAgendaRecurringDates(conversionMonth, agendaWeekdays)
          : [];

      if (hasCompleteAgendaData && agendaDates.length === 0) {
        throw new Error("AGENDA_REQUIRED");
      }

      const agendaPendingNote =
        hasCompleteAgendaData
          ? null
          : "Agenda convertida sem ocorrencias por confirmacao da Secretaria; preencher dias e horario depois.";
      const agendaStudentNotes = [request.notes, agendaPendingNote]
        .filter(Boolean)
        .join("\n\n");

      const agendaStudent = await tx.agendaStudent.create({
        data: {
          defaultTime: intendedTime,
          isActive: true,
          name: request.fullName,
          notes: agendaStudentNotes || null,
          phone: contactPhone,
          unit: request.unit,
          weekdayMask: request.intendedWeekdayMask,
        },
      });

      if (agendaDates.length > 0 && intendedTime) {
        await tx.agendaLesson.createMany({
          data: agendaDates.map((date) => {
            const dateParts = getAgendaDateParts(date);

            return {
              date,
              isActive: true,
              isMakeup: false,
              month: dateParts.month,
              notes: "Criada a partir do pre-cadastro da Secretaria.",
              status: "SCHEDULED",
              studentId: agendaStudent.id,
              time: intendedTime,
              weekday: dateParts.weekday,
              year: dateParts.year,
            };
          }),
        });
      }

      await tx.agendaLog.create({
        data: {
          action: "CREATE_FROM_PRE_REGISTRATION",
          createdByUserId: context.session.user.id,
          description: hasCompleteAgendaData
            ? `Agenda criada a partir do pre-cadastro para ${agendaStudent.name}: ${agendaDates.length} aula(s) ate dezembro.`
            : `Agenda criada a partir do pre-cadastro para ${agendaStudent.name} sem ocorrencias; dias e horario ficaram pendentes.`,
          studentId: agendaStudent.id,
        },
      });
      postConversionMessage = hasCompleteAgendaData
        ? "Aluno convertido com AVA, financeiro e agenda criados."
        : "Aluno convertido com AVA e financeiro. Agenda criada sem ocorrencias; preencha dias e horario depois.";

      await tx.studentPreRegistration.update({
        where: { id: request.id },
        data: {
          assignedTeacherProfileId: teacherProfileId,
          convertedAgendaStudentId: agendaStudent.id,
          convertedFinancialStudentId: financialStudent.id,
          convertedStudentProfileId: studentProfile.id,
          convertedUserId: user.id,
          email: request.email ?? emailForLogin,
          reviewedAt: new Date(),
          reviewedByUserId: context.session.user.id,
          status: "APPROVED",
          statusNote: hasCompleteAgendaData
            ? "Convertido em aluno com AVA, financeiro e agenda."
            : "Convertido em aluno com AVA, financeiro e agenda pendente de dias/horario.",
        },
      });
    });
  } catch (error) {
    const errorMessage = (error as Error).message;

    if (
      isUniqueConstraintError(error) ||
      errorMessage === "USER_EMAIL_EXISTS"
    ) {
      return {
        errors: {
          emailForLogin: "Ja existe um usuario com este email/login.",
        },
        ok: false,
        message: "Ja existe um usuario com este email no AVA.",
      };
    }

    if (errorMessage === "PRE_REGISTRATION_EMAIL_EXISTS") {
      return {
        errors: {
          emailForLogin: "Ja existe outro pre-cadastro com este email/login.",
        },
        ok: false,
        message: "Ja existe outro pre-cadastro com este email/login.",
      };
    }

    if (errorMessage === "EMAIL_REQUIRED") {
      return {
        errors: {
          requestId: "Informe um email antes de tornar aluno.",
        },
        ok: false,
        message: "Para criar login STUDENT, o pre-cadastro precisa ter email.",
      };
    }

    if (errorMessage === "FINANCE_REQUIRED") {
      return {
        errors: {
          requestId:
            "Preencha mensalidade, dia de pagamento e forma antes de converter.",
        },
        ok: false,
        message:
          "Preencha o combinado financeiro antes de tornar aluno.",
      };
    }

    if (errorMessage === "AGENDA_REQUIRED") {
      return {
        errors: {
          requestId: "Preencha dias e horario de aula antes de converter.",
        },
        ok: false,
        message: "Preencha a agenda pretendida antes de tornar aluno.",
      };
    }

    if (errorMessage === "AGENDA_CONFIRMATION_REQUIRED") {
      return {
        errors: {
          confirmMissingAgendaData:
            "Confirme que a agenda sera preenchida depois.",
        },
        ok: false,
        message:
          "A agenda esta incompleta. Confirme o preenchimento posterior antes de converter.",
      };
    }

    if (errorMessage === "REQUEST_FORBIDDEN") {
      return {
        ok: false,
        message: "Voce nao tem permissao para este pre-cadastro.",
      };
    }

    if (errorMessage === "REQUEST_NOT_FOUND") {
      return {
        ok: false,
        message: "Solicitacao nao encontrada.",
      };
    }

    if (errorMessage === "REQUEST_NOT_ACCEPTABLE") {
      return {
        ok: false,
        message: "Esta solicitacao nao pode mais ser aceita.",
      };
    }

    if (errorMessage === "REQUEST_ALREADY_CONVERTED") {
      return {
        ok: false,
        message: "Este pre-cadastro ja foi convertido.",
      };
    }

    if (errorMessage === "TEACHER_PROFILE_REQUIRED") {
      return {
        ok: false,
        message: "Perfil teacher nao encontrado para converter este aluno.",
      };
    }

    if (errorMessage === "TEACHER_NOT_FOUND") {
      return {
        errors: {
          teacherProfileIdForConversion: "Teacher responsavel nao encontrada.",
        },
        ok: false,
        message: "Revise a teacher responsavel antes de converter.",
      };
    }

    if (errorMessage === "USER_PHONE_EXISTS") {
      return {
        errors: {
          requestId: "Ja existe usuario com telefone igual ou parecido.",
        },
        ok: false,
        message: "Ja existe um aluno com este telefone no AVA.",
      };
    }

    if (errorMessage === "FINANCIAL_DUPLICATE") {
      return {
        errors: {
          requestId: "Ja existe aluno financeiro com este email ou telefone.",
        },
        ok: false,
        message:
          "Ja existe um registro financeiro com este email ou telefone.",
      };
    }

    if (errorMessage === "AGENDA_DUPLICATE") {
      return {
        errors: {
          requestId:
            "Ja existe agenda ativa com este nome, dias e horario.",
        },
        ok: false,
        message: "Ja existe uma agenda ativa parecida para este aluno.",
      };
    }

    return {
      ok: false,
      message: "Nao foi possivel converter o aluno agora.",
    };
  }

  let message = postConversionMessage;

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
        "Aluno convertido, mas o contexto Catty nao foi salvo. Revise em Memoria da Catty.";
    } else {
      message = `${postConversionMessage} Contexto Catty inicial salvo.`;
    }
  }

  revalidatePreRegistrationPaths();

  return {
    ok: true,
    message,
  };
}
