"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";
import {
  adminAssignTeacherSchema,
  adminCreateUserSchema,
  adminToggleUserStatusSchema,
  type AdminAssignTeacherInput,
  type AdminCreateUserInput,
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
  const { bio, birthDate, email, level, name, notes, password, role } =
    parsed.data;
  const passwordHash = await hash(password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          role,
        },
      });

      if (role === "STUDENT") {
        await tx.studentProfile.create({
          data: {
            birthDate,
            level,
            notes,
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
