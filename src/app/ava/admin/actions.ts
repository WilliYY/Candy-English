"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  decryptAdminCredentialSecret,
  encryptAdminCredentialSecret,
  getAdminCredentialSecretDigest,
  getAdminCredentialSecretPreview,
} from "@/lib/admin-credentials";
import { setMaintenanceMode } from "@/lib/app-settings";
import { upsertCattyUserMemory } from "@/lib/catty-user-memory";
import { getPrisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";
import {
  adminCredentialCreateSchema,
  adminCredentialIdSchema,
  adminCredentialUpdateSchema,
  type AdminCredentialCreateInput,
  type AdminCredentialIdInput,
  type AdminCredentialUpdateInput,
} from "@/lib/validations/admin-credentials";
import {
  adminAgendaAttendanceSchema,
  adminAgendaMakeupSchema,
  adminAgendaRemoveStudentSchema,
  adminAgendaScheduleCreateSchema,
  adminAgendaStudentDeleteSchema,
  adminAgendaStudentUpdateSchema,
  adminMaintenanceSchema,
  adminAssignTeacherSchema,
  adminCreateUserSchema,
  adminFinanceExportLogSchema,
  adminFinancePaymentUpdateSchema,
  adminFinanceStatusSchema,
  adminFinanceStudentCreateSchema,
  adminFinanceStudentDeleteSchema,
  adminFinanceStudentUpdateSchema,
  adminResetUserPasswordSchema,
  adminSiteContentSchema,
  adminToggleUserStatusSchema,
  adminUpdateStudentContactSchema,
  type AdminAgendaAttendanceInput,
  type AdminAgendaMakeupInput,
  type AdminAgendaRemoveStudentInput,
  type AdminAgendaScheduleCreateInput,
  type AdminAgendaStudentDeleteInput,
  type AdminAgendaStudentUpdateInput,
  type AdminMaintenanceInput,
  type AdminAssignTeacherInput,
  type AdminCreateUserInput,
  type AdminFinanceExportLogInput,
  type AdminFinancePaymentUpdateInput,
  type AdminFinanceStatusInput,
  type AdminFinanceStudentCreateInput,
  type AdminFinanceStudentDeleteInput,
  type AdminFinanceStudentUpdateInput,
  type AdminResetUserPasswordInput,
  type AdminSiteContentInput,
  type AdminToggleUserStatusInput,
  type AdminUpdateStudentContactInput,
} from "@/lib/validations/admin-users";

export type AdminCreateUserResult = {
  errors?: Partial<Record<keyof AdminCreateUserInput, string>>;
  message: string;
  ok: boolean;
};

export type AdminActionResult<TInput extends Record<string, unknown>> = {
  errors?: Partial<Record<keyof TInput, string>>;
  message: string;
  ok: boolean;
};

export type AdminRevealCredentialResult = {
  message: string;
  ok: boolean;
  secret?: string;
};

const FINANCE_YEAR_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const AGENDA_YEAR = 2026;

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
};

function getFinanceMonthsFrom(month: number) {
  return FINANCE_YEAR_MONTHS.filter((candidateMonth) => candidateMonth >= month);
}

function getFinanceMonthsForPlan(month: number, installmentsTotal?: number) {
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
    const lastDay = new Date(Date.UTC(AGENDA_YEAR, month, 0)).getUTCDate();

    for (let day = 1; day <= lastDay; day += 1) {
      const date = new Date(Date.UTC(AGENDA_YEAR, month - 1, day, 12));

      if (selectedWeekdays.has(date.getUTCDay())) {
        dates.push(date);
      }
    }
  }

  return dates;
}

function buildAgendaWeekdayMask(weekdays: number[]) {
  return weekdays.reduce((mask, weekday) => mask | (1 << weekday), 0);
}

function getAgendaDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

function isAllowedRole(role: unknown): role is Role {
  return role === "ADMIN" || role === "TEACHER" || role === "STUDENT";
}

async function requireAdmin() {
  const session = await auth();

  if (!isAllowedRole(session?.user?.role) || session.user.role !== "ADMIN") {
    return null;
  }

  return session;
}

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

export async function createAdminCredential(
  input: AdminCredentialCreateInput,
): Promise<AdminActionResult<AdminCredentialCreateInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para registrar APIs e senhas.",
    };
  }

  const parsed = adminCredentialCreateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminCredentialCreateInput>(parsed.error.issues),
      ok: false,
      message: "Revise os dados da credencial.",
    };
  }

  const prisma = getPrisma();
  const secretCiphertext = encryptAdminCredentialSecret(parsed.data.secret);

  await prisma.adminCredential.create({
    data: {
      createdByUserId: session.user.id,
      kind: parsed.data.kind,
      label: parsed.data.label,
      notes: parsed.data.notes ?? null,
      secretCiphertext,
      secretDigest: getAdminCredentialSecretDigest(parsed.data.secret),
      secretPreview: getAdminCredentialSecretPreview(parsed.data.secret),
      service: parsed.data.service,
      source: "MANUAL",
      updatedByUserId: session.user.id,
      url: parsed.data.url ?? null,
      username: parsed.data.username ?? null,
    },
  });

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Credencial registrada com seguranca.",
  };
}

export async function updateAdminCredential(
  input: AdminCredentialUpdateInput,
): Promise<AdminActionResult<AdminCredentialUpdateInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para alterar APIs e senhas.",
    };
  }

  const parsed = adminCredentialUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminCredentialUpdateInput>(parsed.error.issues),
      ok: false,
      message: "Revise os dados da credencial.",
    };
  }

  const prisma = getPrisma();
  const credential = await prisma.adminCredential.findUnique({
    where: { id: parsed.data.credentialId },
    select: { id: true, source: true },
  });

  if (!credential) {
    return {
      ok: false,
      message: "Credencial nao encontrada.",
    };
  }

  if (credential.source === "ENV" && parsed.data.secret) {
    return {
      errors: {
        secret: "Valores vindos do .env precisam ser alterados no servidor.",
      },
      ok: false,
      message: "Essa credencial vem do ambiente do servidor.",
    };
  }

  const secretData = parsed.data.secret
    ? {
        secretCiphertext: encryptAdminCredentialSecret(parsed.data.secret),
        secretDigest: getAdminCredentialSecretDigest(parsed.data.secret),
        secretPreview: getAdminCredentialSecretPreview(parsed.data.secret),
      }
    : {};

  await prisma.adminCredential.update({
    where: { id: credential.id },
    data: {
      ...secretData,
      kind: parsed.data.kind,
      label: parsed.data.label,
      notes: parsed.data.notes ?? null,
      service: parsed.data.service,
      updatedByUserId: session.user.id,
      url: parsed.data.url ?? null,
      username: parsed.data.username ?? null,
    },
  });

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Credencial atualizada.",
  };
}

export async function deleteAdminCredential(
  input: AdminCredentialIdInput,
): Promise<AdminActionResult<AdminCredentialIdInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para excluir APIs e senhas.",
    };
  }

  const parsed = adminCredentialIdSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminCredentialIdInput>(parsed.error.issues),
      ok: false,
      message: "Credencial invalida.",
    };
  }

  const prisma = getPrisma();
  const credential = await prisma.adminCredential.findUnique({
    where: { id: parsed.data.credentialId },
    select: { id: true, source: true },
  });

  if (!credential) {
    return {
      ok: false,
      message: "Credencial nao encontrada.",
    };
  }

  if (credential.source === "ENV") {
    return {
      ok: false,
      message: "Credenciais vindas do .env devem ser removidas no servidor.",
    };
  }

  await prisma.adminCredential.delete({
    where: { id: credential.id },
  });

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Credencial excluida.",
  };
}

export async function revealAdminCredential(
  input: AdminCredentialIdInput,
): Promise<AdminRevealCredentialResult> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para revelar APIs e senhas.",
    };
  }

  const parsed = adminCredentialIdSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Credencial invalida.",
    };
  }

  const prisma = getPrisma();
  const credential = await prisma.adminCredential.findUnique({
    where: { id: parsed.data.credentialId },
    select: {
      secretCiphertext: true,
    },
  });

  if (!credential) {
    return {
      ok: false,
      message: "Credencial nao encontrada.",
    };
  }

  try {
    return {
      ok: true,
      message: "Valor revelado apenas nesta tela.",
      secret: decryptAdminCredentialSecret(credential.secretCiphertext),
    };
  } catch {
    return {
      ok: false,
      message: "Nao foi possivel descriptografar esta credencial.",
    };
  }
}

export async function createAvaUser(
  input: AdminCreateUserInput,
): Promise<AdminCreateUserResult> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para cadastrar usuarios.",
    };
  }

  const parsed = adminCreateUserSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminCreateUserInput>(parsed.error.issues),
      ok: false,
      message: "Revise os dados do cadastro.",
    };
  }

  const prisma = getPrisma();
  const {
    bio,
    birthDate,
    cattyContext,
    email,
    guardianDocument,
    level,
    motherName,
    motherPhone,
    name,
    notes,
    password,
    role,
    studentPhone,
    studentPhoneAlt,
  } = parsed.data;
  const passwordHash = await hash(password, 12);
  let createdUserId: string | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          phone: role === "STUDENT" ? studentPhone : undefined,
          role,
        },
      });
      createdUserId = user.id;

      if (role === "STUDENT") {
        await tx.studentProfile.create({
          data: {
            birthDate,
            guardianDocument,
            level,
            motherName,
            motherPhone,
            notes,
            studentPhone,
            studentPhoneAlt,
            userId: user.id,
          },
        });
      }

      if (role === "TEACHER") {
        await tx.teacherProfile.create({
          data: {
            bio,
            userId: user.id,
          },
        });
      }
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        errors: {
          email: "Ja existe um usuario com este email.",
        },
        ok: false,
        message: "Este email ja esta cadastrado.",
      };
    }

    return {
      ok: false,
      message: "Nao foi possivel cadastrar o usuario agora.",
    };
  }

  let message = "Usuario cadastrado com sucesso.";

  if (role === "STUDENT" && cattyContext && createdUserId) {
    const memoryResult = await upsertCattyUserMemory({
      actorRole: "ADMIN",
      actorUserId: session.user.id,
      category: "NOTE",
      confidence: 90,
      key: "contexto_catty",
      source: "ADMIN_NOTE",
      status: "ACTIVE",
      targetUserId: createdUserId,
      value: cattyContext,
    });

    if (!memoryResult.ok) {
      message =
        "Usuario cadastrado, mas o contexto Catty nao foi salvo. Revise em Memoria da Catty.";
    } else {
      message = "Usuario cadastrado com contexto Catty inicial.";
    }
  }

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message,
  };
}

export async function toggleAvaUserStatus(
  input: AdminToggleUserStatusInput,
): Promise<AdminActionResult<AdminToggleUserStatusInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para alterar usuarios.",
    };
  }

  const parsed = adminToggleUserStatusSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminToggleUserStatusInput>(parsed.error.issues),
      ok: false,
      message: "Revise os dados do usuario.",
    };
  }

  if (parsed.data.userId === session.user.id && !parsed.data.isActive) {
    return {
      ok: false,
      message: "Voce nao pode desativar seu proprio acesso.",
    };
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: {
      id: true,
      role: true,
    },
  });

  if (!user) {
    return {
      ok: false,
      message: "Usuario nao encontrado.",
    };
  }

  if (user.role === "ADMIN" && !parsed.data.isActive) {
    const activeAdmins = await prisma.user.count({
      where: {
        isActive: true,
        role: "ADMIN",
      },
    });

    if (activeAdmins <= 1) {
      return {
        ok: false,
        message: "Mantenha pelo menos um admin ativo.",
      };
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isActive: parsed.data.isActive,
      sessionVersion: {
        increment: 1,
      },
    },
  });

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: parsed.data.isActive
      ? "Usuario reativado com sucesso."
      : "Usuario desativado com sucesso.",
  };
}

export async function resetAvaUserPassword(
  input: AdminResetUserPasswordInput,
): Promise<AdminActionResult<AdminResetUserPasswordInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para redefinir senhas.",
    };
  }

  const parsed = adminResetUserPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminResetUserPasswordInput>(parsed.error.issues),
      ok: false,
      message: "Revise a nova senha.",
    };
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: {
      id: true,
      name: true,
    },
  });

  if (!user) {
    return {
      ok: false,
      message: "Usuario nao encontrado.",
    };
  }

  const passwordHash = await hash(parsed.data.newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      sessionVersion: {
        increment: 1,
      },
    },
  });

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: `Senha redefinida para ${user.name}.`,
  };
}

export async function updateStudentContactByAdmin(
  input: AdminUpdateStudentContactInput,
): Promise<AdminActionResult<AdminUpdateStudentContactInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para editar dados de alunos.",
    };
  }

  const parsed = adminUpdateStudentContactSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminUpdateStudentContactInput>(parsed.error.issues),
      ok: false,
      message: "Revise os dados do aluno.",
    };
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: {
      email: true,
      id: true,
      role: true,
      studentProfile: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!user || user.role !== "STUDENT" || !user.studentProfile) {
    return {
      errors: {
        userId: "Aluno nao encontrado.",
      },
      ok: false,
      message: "Aluno nao encontrado.",
    };
  }

  const emailChanged = parsed.data.email !== user.email;
  const studentProfileId = user.studentProfile.id;

  if (emailChanged) {
    const emailOwner = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: {
        id: true,
      },
    });

    if (emailOwner && emailOwner.id !== user.id) {
      return {
        errors: {
          email: "Ja existe um usuario com este email.",
        },
        ok: false,
        message: "Este email ja esta cadastrado.",
      };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          email: parsed.data.email,
          name: parsed.data.name,
          phone: parsed.data.phone ?? null,
          ...(emailChanged
            ? {
                sessionVersion: {
                  increment: 1,
                },
              }
            : {}),
        },
      });

      await tx.studentProfile.update({
        where: { id: studentProfileId },
        data: {
          studentPhone: parsed.data.phone ?? null,
        },
      });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        errors: {
          email: "Ja existe um usuario com este email.",
        },
        ok: false,
        message: "Este email ja esta cadastrado.",
      };
    }

    return {
      ok: false,
      message: "Nao foi possivel atualizar o aluno agora.",
    };
  }

  revalidatePath("/ava/admin");
  revalidatePath("/ava/teacher");
  revalidatePath("/ava/student");

  return {
    ok: true,
    message: emailChanged
      ? "Dados atualizados. O aluno deve entrar com o novo email."
      : "Dados do aluno atualizados.",
  };
}

export async function assignStudentToTeacher(
  input: AdminAssignTeacherInput,
): Promise<AdminActionResult<AdminAssignTeacherInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para criar vinculos.",
    };
  }

  const parsed = adminAssignTeacherSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminAssignTeacherInput>(parsed.error.issues),
      ok: false,
      message: "Revise teacher e aluno.",
    };
  }

  const prisma = getPrisma();
  const [teacher, student] = await Promise.all([
    prisma.teacherProfile.findUnique({
      where: { id: parsed.data.teacherProfileId },
      select: { id: true },
    }),
    prisma.studentProfile.findUnique({
      where: { id: parsed.data.studentProfileId },
      select: { id: true },
    }),
  ]);

  if (!teacher) {
    return {
      errors: { teacherProfileId: "Teacher nao encontrada." },
      ok: false,
      message: "Teacher nao encontrada.",
    };
  }

  if (!student) {
    return {
      errors: { studentProfileId: "Aluno nao encontrado." },
      ok: false,
      message: "Aluno nao encontrado.",
    };
  }

  await prisma.studentTeacherAssignment.upsert({
    where: {
      teacherProfileId_studentProfileId: {
        studentProfileId: student.id,
        teacherProfileId: teacher.id,
      },
    },
    create: {
      studentProfileId: student.id,
      teacherProfileId: teacher.id,
    },
    update: {},
  });

  revalidatePath("/ava/admin");
  revalidatePath("/ava/teacher");

  return {
    ok: true,
    message: "Aluno vinculado a teacher com sucesso.",
  };
}

export async function updateSiteContent(
  input: AdminSiteContentInput,
): Promise<AdminActionResult<AdminSiteContentInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para alterar o site.",
    };
  }

  const parsed = adminSiteContentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminSiteContentInput>(parsed.error.issues),
      ok: false,
      message: "Revise o conteudo do site.",
    };
  }

  const prisma = getPrisma();

  await prisma.sitePageContent.upsert({
    where: { slug: parsed.data.slug },
    create: parsed.data,
    update: {
      ctaLabel: parsed.data.ctaLabel,
      description: parsed.data.description,
      title: parsed.data.title,
    },
  });

  revalidatePath("/");
  revalidatePath("/sobre");
  revalidatePath("/metodologia");
  revalidatePath("/planos");
  revalidatePath("/contato");
  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Conteudo do site atualizado com sucesso.",
  };
}

export async function toggleMaintenanceMode(
  input: AdminMaintenanceInput,
): Promise<AdminActionResult<AdminMaintenanceInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para alterar manutencao.",
    };
  }

  const parsed = adminMaintenanceSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminMaintenanceInput>(parsed.error.issues),
      ok: false,
      message: "Revise a configuracao de manutencao.",
    };
  }

  await setMaintenanceMode(parsed.data.enabled);

  revalidatePath("/ava/admin");
  revalidatePath("/ava/login");
  revalidatePath("/ava/student");

  return {
    ok: true,
    message: parsed.data.enabled
      ? "Modo manutencao ativado para alunos."
      : "Modo manutencao desativado.",
  };
}

export async function createFinancialStudent(
  input: AdminFinanceStudentCreateInput,
): Promise<AdminActionResult<AdminFinanceStudentCreateInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para cadastrar financeiro.",
    };
  }

  const parsed = adminFinanceStudentCreateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminFinanceStudentCreateInput>(parsed.error.issues),
      ok: false,
      message: "Revise os dados do lancamento.",
    };
  }

  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    const student = await tx.financialStudent.create({
      data: {
        address: parsed.data.address,
        amountCents: parsed.data.amount,
        cpf: parsed.data.cpf,
        email: parsed.data.email,
        installmentsTotal: parsed.data.installmentsTotal ?? null,
        name: parsed.data.name,
        paymentDay: parsed.data.paymentDay,
        paymentMethod: parsed.data.paymentMethod,
        phone: parsed.data.phone,
      },
    });

    const financeMonths = getFinanceMonthsForPlan(
      parsed.data.month,
      parsed.data.installmentsTotal,
    );

    await tx.financialPayment.createMany({
      data: financeMonths.map((month) => ({
        ...buildFinancialPaymentSnapshot(
          student,
          getFinancialInstallmentNumber(
            month,
            parsed.data.month,
            student.installmentsTotal,
          ),
        ),
        isActive: true,
        isPaid: month === parsed.data.month && Boolean(parsed.data.paidAt),
        month,
        note: month === parsed.data.month ? parsed.data.note ?? null : null,
        paidAt: month === parsed.data.month ? parsed.data.paidAt ?? null : null,
        studentId: student.id,
        year: parsed.data.year,
      })),
    });

    const payment = await tx.financialPayment.findUnique({
      where: {
        studentId_year_month: {
          month: parsed.data.month,
          studentId: student.id,
          year: parsed.data.year,
        },
      },
      select: { id: true },
    });

    await tx.financialLog.create({
      data: {
        action: "CREATE",
        createdByUserId: session.user.id,
        description: student.installmentsTotal
          ? `Aluno financeiro criado: ${student.name}, em ${student.installmentsTotal} parcela(s).`
          : `Aluno financeiro criado: ${student.name}.`,
        paymentId: payment?.id,
        studentId: student.id,
      },
    });
  });

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Lancamento financeiro adicionado.",
  };
}

export async function updateFinancialStudent(
  input: AdminFinanceStudentUpdateInput,
): Promise<AdminActionResult<AdminFinanceStudentUpdateInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para atualizar financeiro.",
    };
  }

  const parsed = adminFinanceStudentUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminFinanceStudentUpdateInput>(parsed.error.issues),
      ok: false,
      message: "Revise os dados do aluno financeiro.",
    };
  }

  const prisma = getPrisma();
  const student = await prisma.financialStudent.findUnique({
    where: { id: parsed.data.studentId },
    select: { id: true },
  });

  if (!student) {
    return {
      ok: false,
      message: "Aluno financeiro nao encontrado.",
    };
  }

  await prisma.$transaction(async (tx) => {
    const updatedStudent = await tx.financialStudent.update({
      where: { id: student.id },
      data: {
        address: parsed.data.address ?? null,
        amountCents: parsed.data.amount,
        cpf: parsed.data.cpf ?? null,
        email: parsed.data.email ?? null,
        installmentsTotal: parsed.data.installmentsTotal ?? null,
        name: parsed.data.name,
        paymentDay: parsed.data.paymentDay,
        paymentMethod: parsed.data.paymentMethod,
        phone: parsed.data.phone ?? null,
      },
    });
    const financeMonths = getFinanceMonthsForPlan(
      parsed.data.month,
      updatedStudent.installmentsTotal ?? undefined,
    );

    for (const month of financeMonths) {
      const existingPayment = await tx.financialPayment.findUnique({
        where: {
          studentId_year_month: {
            month,
            studentId: student.id,
            year: parsed.data.year,
          },
        },
        select: { id: true },
      });
      const snapshot = buildFinancialPaymentSnapshot(
        updatedStudent,
        getFinancialInstallmentNumber(
          month,
          parsed.data.month,
          updatedStudent.installmentsTotal,
        ),
      );

      if (existingPayment) {
        await tx.financialPayment.update({
          where: { id: existingPayment.id },
          data: snapshot,
        });
      } else {
        await tx.financialPayment.create({
          data: {
            ...snapshot,
            isActive: true,
            month,
            studentId: student.id,
            year: parsed.data.year,
          },
        });
      }
    }

    if (updatedStudent.installmentsTotal) {
      const activeMonths = new Set(financeMonths);

      await tx.financialPayment.updateMany({
        where: {
          month: {
            gte: parsed.data.month,
          },
          studentId: student.id,
          year: parsed.data.year,
          NOT: {
            month: {
              in: Array.from(activeMonths),
            },
          },
        },
        data: {
          isActive: false,
        },
      });
    }

    await tx.financialLog.create({
      data: {
        action: "UPDATE_STUDENT",
        createdByUserId: session.user.id,
        description: updatedStudent.installmentsTotal
          ? `Dados financeiros atualizados a partir do mes ${parsed.data.month}: ${updatedStudent.name}, ${updatedStudent.installmentsTotal} parcela(s).`
          : `Dados financeiros atualizados a partir do mes ${parsed.data.month}: ${updatedStudent.name}.`,
        studentId: updatedStudent.id,
      },
    });
  });

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Dados do aluno financeiro atualizados.",
  };
}

export async function updateFinancialPaymentDetails(
  input: AdminFinancePaymentUpdateInput,
): Promise<AdminActionResult<AdminFinancePaymentUpdateInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para atualizar financeiro.",
    };
  }

  const parsed = adminFinancePaymentUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminFinancePaymentUpdateInput>(parsed.error.issues),
      ok: false,
      message: "Revise a data e a observacao.",
    };
  }

  const prisma = getPrisma();
  const student = await prisma.financialStudent.findUnique({
    where: { id: parsed.data.studentId },
    select: {
      address: true,
      amountCents: true,
      cpf: true,
      email: true,
      id: true,
      installmentsTotal: true,
      name: true,
      paymentDay: true,
      paymentMethod: true,
      phone: true,
    },
  });

  if (!student) {
    return {
      ok: false,
      message: "Aluno financeiro nao encontrado.",
    };
  }

  await prisma.$transaction(async (tx) => {
    const currentPayment = await tx.financialPayment.findUnique({
      where: {
        studentId_year_month: {
          month: parsed.data.month,
          studentId: student.id,
          year: parsed.data.year,
        },
      },
      select: { isPaid: true, snapshotAmountCents: true },
    });
    const snapshotSource = {
      ...student,
      amountCents: parsed.data.amount ?? currentPayment?.snapshotAmountCents ?? student.amountCents,
    };
    const payment = await tx.financialPayment.upsert({
      where: {
        studentId_year_month: {
          month: parsed.data.month,
          studentId: student.id,
          year: parsed.data.year,
        },
      },
      create: {
        ...buildFinancialPaymentSnapshot(
          snapshotSource,
          getFinancialInstallmentNumber(
            parsed.data.month,
            parsed.data.month,
            student.installmentsTotal,
          ),
        ),
        isActive: true,
        isPaid: Boolean(parsed.data.paidAt),
        month: parsed.data.month,
        note: parsed.data.note ?? null,
        paidAt: parsed.data.paidAt ?? null,
        studentId: student.id,
        year: parsed.data.year,
      },
      update: {
        isPaid: parsed.data.paidAt ? true : currentPayment?.isPaid ?? false,
        note: parsed.data.note ?? null,
        paidAt: parsed.data.paidAt ?? null,
        ...(parsed.data.amount
          ? { snapshotAmountCents: parsed.data.amount }
          : {}),
      },
    });

    await tx.financialLog.create({
      data: {
        action: "UPDATE_PAYMENT",
        createdByUserId: session.user.id,
        description: `Pagamento mensal atualizado: ${student.name}.`,
        paymentId: payment.id,
        studentId: student.id,
      },
    });
  });

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Pagamento mensal atualizado.",
  };
}

export async function toggleFinancialPaymentStatus(
  input: AdminFinanceStatusInput,
): Promise<AdminActionResult<AdminFinanceStatusInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para atualizar financeiro.",
    };
  }

  const parsed = adminFinanceStatusSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminFinanceStatusInput>(parsed.error.issues),
      ok: false,
      message: "Revise o status do lancamento.",
    };
  }

  const prisma = getPrisma();
  const student = await prisma.financialStudent.findUnique({
    where: { id: parsed.data.studentId },
    select: {
      address: true,
      amountCents: true,
      cpf: true,
      email: true,
      id: true,
      installmentsTotal: true,
      name: true,
      paymentDay: true,
      paymentMethod: true,
      phone: true,
    },
  });

  if (!student) {
    return {
      ok: false,
      message: "Aluno financeiro nao encontrado.",
    };
  }

  await prisma.$transaction(async (tx) => {
    const currentPayment = await tx.financialPayment.findUnique({
      where: {
        studentId_year_month: {
          month: parsed.data.month,
          studentId: student.id,
          year: parsed.data.year,
        },
      },
      select: { paidAt: true },
    });
    const payment = await tx.financialPayment.upsert({
      where: {
        studentId_year_month: {
          month: parsed.data.month,
          studentId: student.id,
          year: parsed.data.year,
        },
      },
      create: {
        ...buildFinancialPaymentSnapshot(
          student,
          getFinancialInstallmentNumber(
            parsed.data.month,
            parsed.data.month,
            student.installmentsTotal,
          ),
        ),
        isActive: true,
        isPaid: parsed.data.isPaid,
        month: parsed.data.month,
        paidAt: parsed.data.isPaid ? new Date() : null,
        studentId: student.id,
        year: parsed.data.year,
      },
      update: {
        isPaid: parsed.data.isPaid,
        paidAt: parsed.data.isPaid
          ? currentPayment?.paidAt ?? new Date()
          : null,
      },
    });

    await tx.financialLog.create({
      data: {
        action: "STATUS",
        createdByUserId: session.user.id,
        description: parsed.data.isPaid
          ? `Status marcado como pago: ${student.name}.`
          : `Status marcado como pendente: ${student.name}.`,
        paymentId: payment.id,
        studentId: student.id,
      },
    });
  });

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: parsed.data.isPaid
      ? "Status marcado como pago."
      : "Status marcado como pendente.",
  };
}

export async function deleteFinancialStudent(
  input: AdminFinanceStudentDeleteInput,
): Promise<AdminActionResult<AdminFinanceStudentDeleteInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para excluir financeiro.",
    };
  }

  const parsed = adminFinanceStudentDeleteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminFinanceStudentDeleteInput>(parsed.error.issues),
      ok: false,
      message: "Revise o aluno financeiro.",
    };
  }

  const prisma = getPrisma();
  const student = await prisma.financialStudent.findUnique({
    where: { id: parsed.data.studentId },
    select: { id: true, name: true },
  });

  if (!student) {
    return {
      ok: false,
      message: "Aluno financeiro nao encontrado.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.financialLog.create({
      data: {
        action: parsed.data.mode === "FROM_MONTH" ? "CLOSE_STUDENT" : "DELETE",
        createdByUserId: session.user.id,
        description:
          parsed.data.mode === "FROM_MONTH"
            ? `Aluno financeiro encerrado a partir do mes ${parsed.data.month}: ${student.name}.`
            : `Aluno financeiro retirado do mes ${parsed.data.month}: ${student.name}.`,
        studentId: student.id,
      },
    });

    await tx.financialPayment.updateMany({
      where: {
        month:
          parsed.data.mode === "FROM_MONTH"
            ? {
                gte: parsed.data.month,
              }
            : parsed.data.month,
        studentId: student.id,
        year: parsed.data.year,
      },
      data: {
        isActive: false,
      },
    });
  });

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message:
      parsed.data.mode === "FROM_MONTH"
        ? "Aluno encerrado a partir deste mes."
        : "Aluno retirado deste mes.",
  };
}

export async function recordFinancialExport(
  input: AdminFinanceExportLogInput,
): Promise<AdminActionResult<AdminFinanceExportLogInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para exportar financeiro.",
    };
  }

  const parsed = adminFinanceExportLogSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminFinanceExportLogInput>(parsed.error.issues),
      ok: false,
      message: "Revise o mes da exportacao.",
    };
  }

  const prisma = getPrisma();

  await prisma.financialLog.create({
    data: {
      action: "EXPORT",
      createdByUserId: session.user.id,
      description: `Exportacao ${parsed.data.format} do financeiro ${parsed.data.year}/${parsed.data.month}.`,
    },
  });

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Exportacao registrada no log.",
  };
}

export async function createAgendaSchedule(
  input: AdminAgendaScheduleCreateInput,
): Promise<AdminActionResult<AdminAgendaScheduleCreateInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para cadastrar agenda.",
    };
  }

  const parsed = adminAgendaScheduleCreateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminAgendaScheduleCreateInput>(parsed.error.issues),
      ok: false,
      message: "Revise os dados da agenda.",
    };
  }

  const dates = getAgendaRecurringDates(
    parsed.data.month,
    parsed.data.weekdays,
  );

  if (dates.length === 0) {
    return {
      ok: false,
      message: "Nenhum dia encontrado para essa agenda.",
    };
  }

  const prisma = getPrisma();
  const duplicateLesson = await prisma.agendaLesson.findFirst({
    where: {
      isActive: true,
      isMakeup: false,
      time: parsed.data.time,
      weekday: {
        in: parsed.data.weekdays,
      },
      year: parsed.data.year,
      student: {
        name: {
          equals: parsed.data.name,
          mode: "insensitive",
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (duplicateLesson) {
    return {
      ok: false,
      message: "Esse aluno ja tem agenda ativa nesse dia e horario.",
    };
  }

  await prisma.$transaction(async (tx) => {
    const student = await tx.agendaStudent.create({
      data: {
        defaultTime: parsed.data.time,
        isActive: true,
        name: parsed.data.name,
        notes: parsed.data.notes ?? null,
        phone: parsed.data.phone ?? null,
        weekdayMask: buildAgendaWeekdayMask(parsed.data.weekdays),
      },
    });

    await tx.agendaLesson.createMany({
      data: dates.map((date) => {
        const parts = getAgendaDateParts(date);

        return {
          date,
          isActive: true,
          isMakeup: false,
          month: parts.month,
          status: "SCHEDULED",
          studentId: student.id,
          time: parsed.data.time,
          weekday: parts.weekday,
          year: parsed.data.year,
        };
      }),
    });

    await tx.agendaLog.create({
      data: {
        action: "CREATE_SCHEDULE",
        createdByUserId: session.user.id,
        description: `Agenda criada para ${student.name}: ${dates.length} aula(s) ate dezembro.`,
        studentId: student.id,
      },
    });
  });

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Aluno adicionado na agenda.",
  };
}

export async function updateAgendaStudentSchedule(
  input: AdminAgendaStudentUpdateInput,
): Promise<AdminActionResult<AdminAgendaStudentUpdateInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para editar agenda.",
    };
  }

  const parsed = adminAgendaStudentUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminAgendaStudentUpdateInput>(parsed.error.issues),
      ok: false,
      message: "Revise os dados do aluno da agenda.",
    };
  }

  const dates = parsed.data.isActive
    ? getAgendaRecurringDates(parsed.data.month, parsed.data.weekdays)
    : [];

  if (parsed.data.isActive && dates.length === 0) {
    return {
      ok: false,
      message: "Nenhum dia encontrado para essa agenda.",
    };
  }

  const prisma = getPrisma();
  const student = await prisma.agendaStudent.findUnique({
    where: { id: parsed.data.studentId },
    select: { id: true, name: true },
  });

  if (!student) {
    return {
      ok: false,
      message: "Aluno da agenda nao encontrado.",
    };
  }

  if (parsed.data.isActive) {
    const duplicateLesson = await prisma.agendaLesson.findFirst({
      where: {
        isActive: true,
        isMakeup: false,
        studentId: {
          not: student.id,
        },
        time: parsed.data.time,
        weekday: {
          in: parsed.data.weekdays,
        },
        year: parsed.data.year,
        student: {
          name: {
            equals: parsed.data.name,
            mode: "insensitive",
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicateLesson) {
      return {
        ok: false,
        message: "Esse aluno ja tem agenda ativa nesse dia e horario.",
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.agendaStudent.update({
      where: { id: student.id },
      data: {
        defaultTime: parsed.data.isActive ? parsed.data.time : null,
        isActive: parsed.data.isActive,
        name: parsed.data.name,
        notes: parsed.data.notes ?? null,
        phone: parsed.data.phone ?? null,
        weekdayMask: parsed.data.isActive
          ? buildAgendaWeekdayMask(parsed.data.weekdays)
          : 0,
      },
    });

    await tx.agendaLesson.updateMany({
      where: {
        isMakeup: false,
        month: {
          gte: parsed.data.month,
        },
        studentId: student.id,
        year: parsed.data.year,
      },
      data: {
        isActive: false,
      },
    });

    if (parsed.data.isActive) {
      const existingLessons = await tx.agendaLesson.findMany({
        where: {
          isMakeup: false,
          month: {
            gte: parsed.data.month,
          },
          studentId: student.id,
          year: parsed.data.year,
        },
        select: {
          date: true,
          id: true,
          time: true,
        },
      });
      const existingByDateTime = new Map(
        existingLessons.map((lesson) => [
          `${getAgendaDateKey(lesson.date)}|${lesson.time}`,
          lesson.id,
        ]),
      );
      const missingDates: Date[] = [];

      for (const date of dates) {
        const key = `${getAgendaDateKey(date)}|${parsed.data.time}`;
        const existingLessonId = existingByDateTime.get(key);

        if (existingLessonId) {
          await tx.agendaLesson.update({
            where: { id: existingLessonId },
            data: {
              isActive: true,
            },
          });
        } else {
          missingDates.push(date);
        }
      }

      if (missingDates.length > 0) {
        await tx.agendaLesson.createMany({
          data: missingDates.map((date) => {
            const parts = getAgendaDateParts(date);

            return {
              date,
              isActive: true,
              isMakeup: false,
              month: parts.month,
              status: "SCHEDULED",
              studentId: student.id,
              time: parsed.data.time,
              weekday: parts.weekday,
              year: parsed.data.year,
            };
          }),
        });
      }
    }

    await tx.agendaLog.create({
      data: {
        action: parsed.data.isActive ? "UPDATE_SCHEDULE" : "INACTIVATE_STUDENT",
        createdByUserId: session.user.id,
        description: parsed.data.isActive
          ? `Agenda atualizada para ${parsed.data.name}.`
          : `Aluno inativado na agenda: ${parsed.data.name}.`,
        studentId: student.id,
      },
    });
  });

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: parsed.data.isActive
      ? "Agenda do aluno atualizada."
      : "Aluno inativado na agenda.",
  };
}

export async function deleteAgendaStudent(
  input: AdminAgendaStudentDeleteInput,
): Promise<AdminActionResult<AdminAgendaStudentDeleteInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para excluir aluno da agenda.",
    };
  }

  const parsed = adminAgendaStudentDeleteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminAgendaStudentDeleteInput>(parsed.error.issues),
      ok: false,
      message: "Revise o aluno da agenda.",
    };
  }

  const prisma = getPrisma();
  const student = await prisma.agendaStudent.findUnique({
    where: { id: parsed.data.studentId },
    select: {
      _count: {
        select: {
          lessons: true,
        },
      },
      id: true,
      name: true,
    },
  });

  if (!student) {
    return {
      ok: false,
      message: "Aluno da agenda nao encontrado.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.agendaLog.create({
      data: {
        action: "DELETE_STUDENT",
        createdByUserId: session.user.id,
        description: `Aluno excluido da agenda: ${student.name}. ${student._count.lessons} ocorrencia(s) removida(s).`,
        studentId: student.id,
      },
    });

    await tx.agendaStudent.delete({
      where: {
        id: student.id,
      },
    });
  });

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Aluno excluido da agenda.",
  };
}

export async function updateAgendaAttendance(
  input: AdminAgendaAttendanceInput,
): Promise<AdminActionResult<AdminAgendaAttendanceInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para atualizar agenda.",
    };
  }

  const parsed = adminAgendaAttendanceSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminAgendaAttendanceInput>(parsed.error.issues),
      ok: false,
      message: "Revise a presenca da agenda.",
    };
  }

  const prisma = getPrisma();
  const lesson = await prisma.agendaLesson.findUnique({
    where: { id: parsed.data.lessonId },
    select: {
      id: true,
      isMakeup: true,
      student: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!lesson) {
    return {
      ok: false,
      message: "Aula da agenda nao encontrada.",
    };
  }

  const status =
    parsed.data.status === "ATTENDED" && lesson.isMakeup
      ? "MAKEUP_ATTENDED"
      : parsed.data.status;

  await prisma.$transaction(async (tx) => {
    await tx.agendaLesson.update({
      where: { id: lesson.id },
      data: {
        status,
      },
    });

    await tx.agendaLog.create({
      data: {
        action: "ATTENDANCE",
        createdByUserId: session.user.id,
        description:
          status === "ATTENDED" || status === "MAKEUP_ATTENDED"
            ? `Presenca confirmada: ${lesson.student.name}.`
            : status === "MISSED"
              ? `Falta registrada: ${lesson.student.name}.`
              : `Presenca resetada: ${lesson.student.name}.`,
        lessonId: lesson.id,
        studentId: lesson.student.id,
      },
    });
  });

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Agenda atualizada.",
  };
}

export async function createAgendaMakeup(
  input: AdminAgendaMakeupInput,
): Promise<AdminActionResult<AdminAgendaMakeupInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para criar reposicao.",
    };
  }

  const parsed = adminAgendaMakeupSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminAgendaMakeupInput>(parsed.error.issues),
      ok: false,
      message: "Revise a reposicao.",
    };
  }

  const prisma = getPrisma();
  const lesson = await prisma.agendaLesson.findUnique({
    where: { id: parsed.data.lessonId },
    select: {
      id: true,
      student: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!lesson) {
    return {
      ok: false,
      message: "Aula original nao encontrada.",
    };
  }

  const dateParts = getAgendaDateParts(parsed.data.date);

  await prisma.$transaction(async (tx) => {
    await tx.agendaLesson.update({
      where: { id: lesson.id },
      data: {
        notes: parsed.data.notes ?? null,
        status: "MISSED",
      },
    });

    const makeupLesson = await tx.agendaLesson.create({
      data: {
        date: parsed.data.date,
        isActive: true,
        isMakeup: true,
        makeupForLessonId: lesson.id,
        month: dateParts.month,
        notes: parsed.data.notes ?? null,
        status: "MAKEUP_SCHEDULED",
        studentId: lesson.student.id,
        time: parsed.data.time,
        weekday: dateParts.weekday,
        year: dateParts.year,
      },
    });

    await tx.agendaLog.create({
      data: {
        action: "MAKEUP",
        createdByUserId: session.user.id,
        description: `Reposicao criada para ${lesson.student.name}.`,
        lessonId: makeupLesson.id,
        studentId: lesson.student.id,
      },
    });
  });

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Reposicao criada.",
  };
}

export async function removeAgendaStudentFromMonth(
  input: AdminAgendaRemoveStudentInput,
): Promise<AdminActionResult<AdminAgendaRemoveStudentInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para retirar aluno da agenda.",
    };
  }

  const parsed = adminAgendaRemoveStudentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminAgendaRemoveStudentInput>(parsed.error.issues),
      ok: false,
      message: "Revise o aluno da agenda.",
    };
  }

  const prisma = getPrisma();
  const student = await prisma.agendaStudent.findUnique({
    where: { id: parsed.data.studentId },
    select: { id: true, name: true },
  });

  if (!student) {
    return {
      ok: false,
      message: "Aluno da agenda nao encontrado.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.agendaStudent.update({
      where: {
        id: student.id,
      },
      data: {
        defaultTime: null,
        isActive: false,
        weekdayMask: 0,
      },
    });

    await tx.agendaLesson.updateMany({
      where: {
        isMakeup: false,
        month: {
          gte: parsed.data.month,
        },
        studentId: student.id,
        year: parsed.data.year,
      },
      data: {
        isActive: false,
      },
    });

    await tx.agendaLog.create({
      data: {
        action: "REMOVE_STUDENT",
        createdByUserId: session.user.id,
        description: `Aluno retirado da agenda a partir do mes ${parsed.data.month}: ${student.name}.`,
        studentId: student.id,
      },
    });
  });

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Aluno retirado da agenda deste mes em diante.",
  };
}
