import { hash } from "bcryptjs";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import type { MobileAuthUser } from "@/lib/mobile-auth/contracts";
import { acquireTransactionAdvisoryLock } from "@/lib/postgres-advisory-lock";
import { getPrisma } from "@/lib/prisma";
import { ensureStudentAdministrativeRecords } from "@/lib/student-administrative-linkage";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .optional()
    .transform((value) => value || undefined);

const createInputSchema = z
  .object({
    address: optionalText(240),
    bio: optionalText(1000),
    confirmPassword: z.string().min(8).max(120),
    email: z.string().trim().email().max(180).transform((value) => value.toLowerCase()),
    level: optionalText(80),
    name: z.string().trim().min(2).max(120),
    password: z.string().min(8).max(120),
    phone: optionalText(40),
    role: z.enum(["ADMIN", "TEACHER", "STUDENT"]),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        message: "As senhas precisam ser iguais.",
        path: ["confirmPassword"],
      });
    }
    if (value.role !== "STUDENT" && value.level) {
      context.addIssue({
        code: "custom",
        message: "Nivel e usado apenas para alunos.",
        path: ["level"],
      });
    }
    if (value.role !== "TEACHER" && value.bio) {
      context.addIssue({
        code: "custom",
        message: "Bio e usada apenas para teachers.",
        path: ["bio"],
      });
    }
  });

const updateInputSchema = z
  .object({
    address: optionalText(240),
    bio: optionalText(1000),
    email: z.string().trim().email().max(180).transform((value) => value.toLowerCase()),
    expectedUpdatedAt: z.string().datetime(),
    level: optionalText(80),
    name: z.string().trim().min(2).max(120),
    phone: optionalText(40),
  })
  .strict();

const statusInputSchema = z
  .object({
    confirmStatusChange: z.literal(true),
    expectedUpdatedAt: z.string().datetime(),
    isActive: z.boolean(),
  })
  .strict();

const passwordResetInputSchema = z
  .object({
    confirmNewPassword: z.string().min(8).max(120),
    confirmPasswordReset: z.literal(true),
    expectedUpdatedAt: z.string().datetime(),
    newPassword: z.string().min(8).max(120),
  })
  .strict()
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    message: "As senhas precisam ser iguais.",
    path: ["confirmNewPassword"],
  });

const userIdSchema = z.string().trim().min(1).max(200);

export type MobileAdminUserMutationStore = Pick<
  ReturnType<typeof getPrisma>,
  "$transaction"
>;

type Options = {
  acquireLock?: (transaction: Prisma.TransactionClient) => Promise<void>;
  ensureAdministrativeRecords?: typeof ensureStudentAdministrativeRecords;
  hashPassword?: (password: string) => Promise<string>;
  now?: () => Date;
  store?: MobileAdminUserMutationStore;
};

export class MobileAdminUserMutationError extends Error {
  constructor(
    public readonly code:
      | "EDIT_CONFLICT"
      | "EMAIL_CONFLICT"
      | "INVALID_INPUT"
      | "LAST_ACTIVE_ADMIN"
      | "ROLE_FORBIDDEN"
      | "SELF_DEACTIVATION"
      | "USER_NOT_FOUND",
  ) {
    super(code);
    this.name = "MobileAdminUserMutationError";
  }
}

function requireAdmin(actor: MobileAuthUser) {
  if (actor.role !== "ADMIN") {
    throw new MobileAdminUserMutationError("ROLE_FORBIDDEN");
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

function invalidInput() {
  return new MobileAdminUserMutationError("INVALID_INPUT");
}

export async function createMobileAdminUser(
  actor: MobileAuthUser,
  input: unknown,
  options: Options = {},
) {
  requireAdmin(actor);
  const parsed = createInputSchema.safeParse(input);
  if (!parsed.success) throw invalidInput();

  const store = options.store ?? getPrisma();
  const passwordHash = await (options.hashPassword ?? ((value) => hash(value, 12)))(
    parsed.data.password,
  );

  try {
    const userId = await store.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          address: parsed.data.address,
          email: parsed.data.email,
          name: parsed.data.name,
          passwordHash,
          phone: parsed.data.phone,
          role: parsed.data.role,
        },
        select: { id: true },
      });

      if (parsed.data.role === "STUDENT") {
        const studentProfile = await transaction.studentProfile.create({
          data: {
            level: parsed.data.level,
            studentPhone: parsed.data.phone,
            userId: user.id,
          },
        });

        await (
          options.ensureAdministrativeRecords ??
          ensureStudentAdministrativeRecords
        )(transaction, {
          actorUserId: actor.id,
          sourceDescription: "cadastro mobile do Admin",
          studentProfileId: studentProfile.id,
        });
      }
      if (parsed.data.role === "TEACHER") {
        await transaction.teacherProfile.create({
          data: { bio: parsed.data.bio, userId: user.id },
        });
      }

      return user.id;
    });

    return { message: "Usuario cadastrado com sucesso.", userId };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new MobileAdminUserMutationError("EMAIL_CONFLICT");
    }
    throw error;
  }
}

export async function updateMobileAdminUser(
  actor: MobileAuthUser,
  userId: unknown,
  input: unknown,
  options: Options = {},
) {
  requireAdmin(actor);
  const parsedUserId = userIdSchema.safeParse(userId);
  const parsed = updateInputSchema.safeParse(input);
  if (!parsedUserId.success || !parsed.success) throw invalidInput();

  const store = options.store ?? getPrisma();

  try {
    await store.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({
        where: { id: parsedUserId.data },
        select: { deletedAt: true, id: true, role: true, updatedAt: true },
      });
      if (!user || user.deletedAt) {
        throw new MobileAdminUserMutationError("USER_NOT_FOUND");
      }
      if (user.role !== "STUDENT" && parsed.data.level) throw invalidInput();
      if (user.role !== "TEACHER" && parsed.data.bio) throw invalidInput();

      const update = await transaction.user.updateMany({
        where: {
          deletedAt: null,
          id: user.id,
          updatedAt: new Date(parsed.data.expectedUpdatedAt),
        },
        data: {
          address: parsed.data.address ?? null,
          email: parsed.data.email,
          name: parsed.data.name,
          phone: parsed.data.phone ?? null,
        },
      });
      if (update.count !== 1) {
        throw new MobileAdminUserMutationError("EDIT_CONFLICT");
      }

      if (user.role === "STUDENT") {
        const studentProfile = await transaction.studentProfile.upsert({
          where: { userId: user.id },
          create: {
            level: parsed.data.level,
            studentPhone: parsed.data.phone,
            userId: user.id,
          },
          update: {
            level: parsed.data.level ?? null,
            studentPhone: parsed.data.phone ?? null,
          },
          select: { id: true },
        });

        await (
          options.ensureAdministrativeRecords ??
          ensureStudentAdministrativeRecords
        )(transaction, {
          actorUserId: actor.id,
          sourceDescription: "edicao mobile do Admin",
          studentProfileId: studentProfile.id,
        });
      }
      if (user.role === "TEACHER") {
        await transaction.teacherProfile.upsert({
          where: { userId: user.id },
          create: { bio: parsed.data.bio, userId: user.id },
          update: { bio: parsed.data.bio ?? null },
        });
      }
    });

    return { message: "Usuario atualizado com sucesso.", userId: parsedUserId.data };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new MobileAdminUserMutationError("EMAIL_CONFLICT");
    }
    throw error;
  }
}

export async function changeMobileAdminUserStatus(
  actor: MobileAuthUser,
  userId: unknown,
  input: unknown,
  options: Options = {},
) {
  requireAdmin(actor);
  const parsedUserId = userIdSchema.safeParse(userId);
  const parsed = statusInputSchema.safeParse(input);
  if (!parsedUserId.success || !parsed.success) throw invalidInput();
  if (parsedUserId.data === actor.id && !parsed.data.isActive) {
    throw new MobileAdminUserMutationError("SELF_DEACTIVATION");
  }

  const store = options.store ?? getPrisma();
  const now = options.now?.() ?? new Date();
  const acquireLock =
    options.acquireLock ??
    (options.store
      ? async () => undefined
      : (transaction: Prisma.TransactionClient) =>
          acquireTransactionAdvisoryLock(
            transaction,
            "mobile-admin-active-users",
          ));

  return store.$transaction(async (transaction) => {
    await acquireLock(transaction);
    const user = await transaction.user.findUnique({
      where: { id: parsedUserId.data },
      select: {
        deletedAt: true,
        id: true,
        isActive: true,
        role: true,
        updatedAt: true,
      },
    });
    if (!user || user.deletedAt) {
      throw new MobileAdminUserMutationError("USER_NOT_FOUND");
    }

    if (user.isActive === parsed.data.isActive) {
      return {
        changed: false,
        isActive: user.isActive,
        message: user.isActive ? "Usuario ja esta ativo." : "Usuario ja esta inativo.",
        userId: user.id,
      };
    }
    if (user.role === "ADMIN" && !parsed.data.isActive) {
      const activeAdmins = await transaction.user.count({
        where: { isActive: true, role: "ADMIN" },
      });
      if (activeAdmins <= 1) {
        throw new MobileAdminUserMutationError("LAST_ACTIVE_ADMIN");
      }
    }

    const update = await transaction.user.updateMany({
      where: {
        deletedAt: null,
        id: user.id,
        updatedAt: new Date(parsed.data.expectedUpdatedAt),
      },
      data: {
        isActive: parsed.data.isActive,
        sessionVersion: { increment: 1 },
      },
    });
    if (update.count !== 1) {
      throw new MobileAdminUserMutationError("EDIT_CONFLICT");
    }

    if (!parsed.data.isActive) {
      await transaction.mobileSession.updateMany({
        where: { revokedAt: null, userId: user.id },
        data: { revokedAt: now, revokeReason: "USER_DEACTIVATED" },
      });
    }

    return {
      changed: true,
      isActive: parsed.data.isActive,
      message: parsed.data.isActive
        ? "Usuario reativado com sucesso."
        : "Usuario desativado com sucesso.",
      userId: user.id,
    };
  });
}

export async function resetMobileAdminUserPassword(
  actor: MobileAuthUser,
  userId: unknown,
  input: unknown,
  options: Options = {},
) {
  requireAdmin(actor);
  const parsedUserId = userIdSchema.safeParse(userId);
  const parsed = passwordResetInputSchema.safeParse(input);
  if (!parsedUserId.success || !parsed.success) throw invalidInput();

  const passwordHash = await (options.hashPassword ?? ((password) => hash(password, 12)))(
    parsed.data.newPassword,
  );
  const store = options.store ?? getPrisma();
  const now = options.now?.() ?? new Date();

  return store.$transaction(async (transaction) => {
    const update = await transaction.user.updateMany({
      where: {
        deletedAt: null,
        id: parsedUserId.data,
        updatedAt: new Date(parsed.data.expectedUpdatedAt),
      },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
      },
    });

    if (update.count !== 1) {
      const user = await transaction.user.findUnique({
        where: { id: parsedUserId.data },
        select: { deletedAt: true, id: true },
      });
      throw new MobileAdminUserMutationError(
        user && !user.deletedAt ? "EDIT_CONFLICT" : "USER_NOT_FOUND",
      );
    }

    await transaction.mobileSession.updateMany({
      where: { revokedAt: null, userId: parsedUserId.data },
      data: { revokedAt: now, revokeReason: "PASSWORD_RESET" },
    });

    return {
      message: "Senha redefinida e sessoes encerradas com sucesso.",
      userId: parsedUserId.data,
    };
  });
}
