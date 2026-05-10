"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setMaintenanceMode } from "@/lib/app-settings";
import { getPrisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";
import {
  adminMaintenanceSchema,
  adminAssignTeacherSchema,
  adminCreateUserSchema,
  adminFinanceEntrySchema,
  adminFinanceEntryUpdateSchema,
  adminFinanceStatusSchema,
  adminSiteContentSchema,
  adminToggleUserStatusSchema,
  type AdminMaintenanceInput,
  type AdminAssignTeacherInput,
  type AdminCreateUserInput,
  type AdminFinanceEntryInput,
  type AdminFinanceEntryUpdateInput,
  type AdminFinanceStatusInput,
  type AdminSiteContentInput,
  type AdminToggleUserStatusInput,
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

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Usuario cadastrado com sucesso.",
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

export async function createFinancialEntry(
  input: AdminFinanceEntryInput,
): Promise<AdminActionResult<AdminFinanceEntryInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para cadastrar financeiro.",
    };
  }

  const parsed = adminFinanceEntrySchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminFinanceEntryInput>(parsed.error.issues),
      ok: false,
      message: "Revise os dados do lancamento.",
    };
  }

  const prisma = getPrisma();

  await prisma.financialEntry.create({
    data: {
      amountCents: parsed.data.amount,
      isPaid: Boolean(parsed.data.paidAt),
      month: parsed.data.month,
      note: parsed.data.note,
      paidAt: parsed.data.paidAt,
      payerName: parsed.data.payerName,
      paymentDay: parsed.data.paymentDay,
      year: 2026,
    },
  });

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Lancamento financeiro adicionado.",
  };
}

export async function updateFinancialEntryDetails(
  input: AdminFinanceEntryUpdateInput,
): Promise<AdminActionResult<AdminFinanceEntryUpdateInput>> {
  const session = await requireAdmin();

  if (!session) {
    return {
      ok: false,
      message: "Voce nao tem permissao para atualizar financeiro.",
    };
  }

  const parsed = adminFinanceEntryUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      errors: fieldErrors<AdminFinanceEntryUpdateInput>(parsed.error.issues),
      ok: false,
      message: "Revise a data e a observacao.",
    };
  }

  const prisma = getPrisma();
  const entry = await prisma.financialEntry.findUnique({
    where: { id: parsed.data.entryId },
    select: { id: true },
  });

  if (!entry) {
    return {
      ok: false,
      message: "Lancamento financeiro nao encontrado.",
    };
  }

  await prisma.financialEntry.update({
    where: { id: entry.id },
    data: {
      note: parsed.data.note ?? null,
      paidAt: parsed.data.paidAt ?? null,
    },
  });

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: "Lancamento financeiro atualizado.",
  };
}

export async function toggleFinancialEntryStatus(
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
  const entry = await prisma.financialEntry.findUnique({
    where: { id: parsed.data.entryId },
    select: { id: true },
  });

  if (!entry) {
    return {
      ok: false,
      message: "Lancamento financeiro nao encontrado.",
    };
  }

  await prisma.financialEntry.update({
    where: { id: entry.id },
    data: {
      isPaid: parsed.data.isPaid,
    },
  });

  revalidatePath("/ava/admin");

  return {
    ok: true,
    message: parsed.data.isPaid
      ? "Status marcado como pago."
      : "Status marcado como pendente.",
  };
}
