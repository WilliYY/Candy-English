"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getLoginIpHash } from "@/lib/login-request-security";
import {
  buildMfaProvisioningUri,
  decryptMfaSecret,
  encryptMfaSecret,
  generateMfaSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyTotpCode,
} from "@/lib/mfa";
import { authenticatePasswordCredentials } from "@/lib/password-auth";
import { acquireTransactionAdvisoryLock } from "@/lib/postgres-advisory-lock";
import { getPrisma } from "@/lib/prisma";
import {
  beginAdminMfaSchema,
  confirmAdminMfaSchema,
  disableAdminMfaSchema,
  type BeginAdminMfaInput,
  type ConfirmAdminMfaInput,
  type DisableAdminMfaInput,
} from "@/lib/validations/mfa";

const ENROLLMENT_MINUTES = 10;

export type AdminMfaActionResult = {
  enrollment?: {
    provisioningUri: string;
    secret: string;
  };
  message: string;
  ok: boolean;
  recoveryCodes?: string[];
};

async function requireCurrentAdmin() {
  const session = await auth();

  if (session?.user?.role !== "ADMIN" || !session.user.id) {
    return null;
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      deletedAt: true,
      email: true,
      id: true,
      isActive: true,
      role: true,
    },
  });

  return user?.role === "ADMIN" && user.isActive && !user.deletedAt
    ? user
    : null;
}

async function reauthenticateCurrentAdmin(
  user: NonNullable<Awaited<ReturnType<typeof requireCurrentAdmin>>>,
  credentials: { mfaCode?: string; password: string },
) {
  const requestHeaders = await headers();
  const authenticatedUser = await authenticatePasswordCredentials(
    {
      email: user.email,
      mfaCode: credentials.mfaCode,
      password: credentials.password,
    },
    { ipHash: getLoginIpHash(requestHeaders) },
  );

  return authenticatedUser?.id === user.id && authenticatedUser.role === "ADMIN";
}

export async function beginAdminMfaEnrollment(
  input: BeginAdminMfaInput,
): Promise<AdminMfaActionResult> {
  const user = await requireCurrentAdmin();

  if (!user) {
    return {
      message: "Voce nao tem permissao para configurar o 2FA.",
      ok: false,
    };
  }

  const parsed = beginAdminMfaSchema.safeParse(input);

  if (!parsed.success || !(await reauthenticateCurrentAdmin(user, parsed.data))) {
    return { message: "Senha atual invalida.", ok: false };
  }

  const prisma = getPrisma();
  const existingMfa = await prisma.userMfa.findUnique({
    where: { userId: user.id },
    select: { enabledAt: true },
  });

  if (existingMfa?.enabledAt) {
    return { message: "O 2FA desta conta ja esta ativo.", ok: false };
  }

  const secret = generateMfaSecret();
  const secretCiphertext = encryptMfaSecret(secret);
  const now = new Date();
  const pendingExpiresAt = new Date(
    now.getTime() + ENROLLMENT_MINUTES * 60 * 1000,
  );

  await prisma.userMfa.upsert({
    where: { userId: user.id },
    create: {
      pendingExpiresAt,
      secretCiphertext,
      userId: user.id,
    },
    update: {
      enabledAt: null,
      lastUsedTimeStep: null,
      pendingExpiresAt,
      recoveryCodeHashes: { set: [] },
      secretCiphertext,
    },
  });

  return {
    enrollment: {
      provisioningUri: buildMfaProvisioningUri(user.email, secret),
      secret,
    },
    message: "Chave temporaria criada. Confirme com o codigo do aplicativo.",
    ok: true,
  };
}

export async function cancelAdminMfaEnrollment(): Promise<AdminMfaActionResult> {
  const user = await requireCurrentAdmin();

  if (!user) {
    return {
      message: "Voce nao tem permissao para cancelar o 2FA.",
      ok: false,
    };
  }

  const prisma = getPrisma();
  await prisma.userMfa.deleteMany({
    where: { userId: user.id, enabledAt: null },
  });

  revalidatePath("/ava/admin");
  return { message: "Configuracao temporaria cancelada.", ok: true };
}

export async function confirmAdminMfaEnrollment(
  input: ConfirmAdminMfaInput,
): Promise<AdminMfaActionResult> {
  const user = await requireCurrentAdmin();

  if (!user) {
    return {
      message: "Voce nao tem permissao para confirmar o 2FA.",
      ok: false,
    };
  }

  const parsed = confirmAdminMfaSchema.safeParse(input);

  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Codigo invalido.", ok: false };
  }

  const prisma = getPrisma();
  const now = new Date();
  const recoveryCodes = generateRecoveryCodes();

  const result = await prisma.$transaction(async (tx) => {
    await acquireTransactionAdvisoryLock(tx, `mfa:${user.id}`);
    const mfa = await tx.userMfa.findUnique({ where: { userId: user.id } });

    if (
      !mfa ||
      mfa.enabledAt ||
      !mfa.pendingExpiresAt ||
      mfa.pendingExpiresAt <= now
    ) {
      return { ok: false as const, reason: "expired" as const };
    }

    const timeStep = verifyTotpCode(
      decryptMfaSecret(mfa.secretCiphertext),
      parsed.data.code,
      { now: now.getTime() },
    );

    if (timeStep === null) {
      return { ok: false as const, reason: "invalid" as const };
    }

    await tx.userMfa.update({
      where: { id: mfa.id },
      data: {
        enabledAt: now,
        lastUsedTimeStep: BigInt(timeStep),
        pendingExpiresAt: null,
        recoveryCodeHashes: {
          set: recoveryCodes.map(hashRecoveryCode),
        },
      },
    });

    return { ok: true as const };
  });

  if (!result.ok) {
    return {
      message:
        result.reason === "expired"
          ? "A configuracao expirou. Gere uma nova chave."
          : "Codigo incorreto. Confira o horario do aparelho e tente novamente.",
      ok: false,
    };
  }

  revalidatePath("/ava/admin");
  return {
    message:
      "2FA ativado. Guarde os codigos de recuperacao; eles nao serao exibidos novamente.",
    ok: true,
    recoveryCodes,
  };
}

export async function disableAdminMfa(
  input: DisableAdminMfaInput,
): Promise<AdminMfaActionResult> {
  const user = await requireCurrentAdmin();

  if (!user) {
    return {
      message: "Voce nao tem permissao para desativar o 2FA.",
      ok: false,
    };
  }

  const parsed = disableAdminMfaSchema.safeParse(input);

  if (!parsed.success) {
    return {
      message: parsed.error.issues[0]?.message ?? "Confira os dados.",
      ok: false,
    };
  }

  if (
    !(await reauthenticateCurrentAdmin(user, {
      mfaCode: parsed.data.code,
      password: parsed.data.password,
    }))
  ) {
    return { message: "Senha atual ou codigo de seguranca invalido.", ok: false };
  }

  const prisma = getPrisma();
  const result = await prisma.$transaction(async (tx) => {
    await acquireTransactionAdvisoryLock(tx, `mfa:${user.id}`);
    const mfa = await tx.userMfa.findUnique({ where: { userId: user.id } });

    if (!mfa?.enabledAt) {
      return false;
    }

    await tx.userMfa.delete({ where: { id: mfa.id } });
    await tx.mobileSession.deleteMany({ where: { userId: user.id } });
    await tx.user.update({
      where: { id: user.id },
      data: { sessionVersion: { increment: 1 } },
    });

    return true;
  });

  if (!result) {
    return { message: "Senha atual ou codigo de seguranca invalido.", ok: false };
  }

  revalidatePath("/ava/admin");
  return {
    message: "2FA desativado e outras sessoes revogadas. Entre novamente.",
    ok: true,
  };
}
