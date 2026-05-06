"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";
import {
  adminCreateUserSchema,
  type AdminCreateUserInput,
} from "@/lib/validations/admin-users";

export type AdminCreateUserResult = {
  errors?: Partial<Record<keyof AdminCreateUserInput, string>>;
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

export async function createAvaUser(
  input: AdminCreateUserInput,
): Promise<AdminCreateUserResult> {
  const session = await auth();

  if (!isAllowedRole(session?.user?.role) || session.user.role !== "ADMIN") {
    return {
      ok: false,
      message: "Voce nao tem permissao para cadastrar usuarios.",
    };
  }

  const parsed = adminCreateUserSchema.safeParse(input);

  if (!parsed.success) {
    const errors = parsed.error.issues.reduce<
      Partial<Record<keyof AdminCreateUserInput, string>>
    >((accumulator, issue) => {
      const fieldName = issue.path[0];

      if (typeof fieldName === "string") {
        accumulator[fieldName as keyof AdminCreateUserInput] = issue.message;
      }

      return accumulator;
    }, {});

    return {
      errors,
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
