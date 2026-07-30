import { acquireTransactionAdvisoryLock } from "@/lib/postgres-advisory-lock";
import { getPrisma } from "@/lib/prisma";
import {
  MOBILE_ACCESS_TOKEN_TTL_MS,
  MOBILE_REFRESH_TOKEN_TTL_MS,
} from "@/lib/mobile-auth/config";
import type {
  MobileAuthResult,
  MobileAuthUser,
  MobileDeviceInput,
} from "@/lib/mobile-auth/contracts";
import { getRefreshSessionProblem } from "@/lib/mobile-auth/session-policy";
import {
  createMobileToken,
  hashMobileToken,
  isRefreshToken,
} from "@/lib/mobile-auth/tokens";
import type { PasswordAuthenticatedUser } from "@/lib/password-auth";

function toMobileUser(user: {
  email: string;
  id: string;
  name: string;
  role: MobileAuthUser["role"];
}): MobileAuthUser {
  return {
    email: user.email,
    id: user.id,
    name: user.name,
    role: user.role,
  };
}

export async function createMobileSession(
  authenticatedUser: PasswordAuthenticatedUser,
  device: MobileDeviceInput,
): Promise<MobileAuthResult> {
  const prisma = getPrisma();
  const now = new Date();
  const access = createMobileToken("access");
  const refresh = createMobileToken("refresh");
  const accessExpiresAt = new Date(now.getTime() + MOBILE_ACCESS_TOKEN_TTL_MS);
  const refreshExpiresAt = new Date(now.getTime() + MOBILE_REFRESH_TOKEN_TTL_MS);

  const user = await prisma.$transaction(async (tx) => {
    const currentUser = await tx.user.findUnique({
      where: { id: authenticatedUser.id },
      select: {
        email: true,
        id: true,
        isActive: true,
        name: true,
        role: true,
        sessionVersion: true,
      },
    });

    if (
      !currentUser?.isActive ||
      currentUser.sessionVersion !== authenticatedUser.sessionVersion
    ) {
      return null;
    }

    const currentDevice = await tx.mobileDevice.upsert({
      where: {
        userId_installationId: {
          installationId: device.installationId,
          userId: currentUser.id,
        },
      },
      create: {
        appVersion: device.appVersion,
        installationId: device.installationId,
        lastSeenAt: now,
        name: device.name,
        platform: device.platform,
        userId: currentUser.id,
      },
      update: {
        appVersion: device.appVersion,
        lastSeenAt: now,
        name: device.name,
        platform: device.platform,
      },
    });

    await tx.mobileSession.updateMany({
      where: {
        deviceId: currentDevice.id,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
        revokeReason: "SIGNED_IN_AGAIN",
      },
    });

    await tx.mobileSession.create({
      data: {
        accessExpiresAt,
        accessTokenHash: access.hash,
        deviceId: currentDevice.id,
        lastUsedAt: now,
        refreshTokens: {
          create: {
            expiresAt: refreshExpiresAt,
            tokenHash: refresh.hash,
          },
        },
        sessionVersion: currentUser.sessionVersion,
        userId: currentUser.id,
      },
    });

    return toMobileUser(currentUser);
  });

  if (!user) {
    return {
      code: "SESSION_CHANGED",
      ok: false,
    };
  }

  return {
    ok: true,
    tokens: {
      accessExpiresAt,
      accessToken: access.value,
      refreshExpiresAt,
      refreshToken: refresh.value,
    },
    user,
  };
}

export async function rotateMobileRefreshToken(
  refreshToken: string,
  expectedInstallationId: string,
): Promise<MobileAuthResult> {
  if (!isRefreshToken(refreshToken)) {
    return { code: "INVALID_TOKEN", ok: false };
  }

  const prisma = getPrisma();
  const now = new Date();
  const refreshTokenHash = hashMobileToken(refreshToken);
  const nextAccess = createMobileToken("access");
  const nextRefresh = createMobileToken("refresh");
  const accessExpiresAt = new Date(now.getTime() + MOBILE_ACCESS_TOKEN_TTL_MS);
  const refreshExpiresAt = new Date(now.getTime() + MOBILE_REFRESH_TOKEN_TTL_MS);

  const result = await prisma.$transaction(async (tx) => {
    await acquireTransactionAdvisoryLock(
      tx,
      `mobile-refresh:${refreshTokenHash}`,
    );

    const currentRefresh = await tx.mobileRefreshToken.findUnique({
      where: { tokenHash: refreshTokenHash },
      include: {
        session: {
          include: {
            device: true,
            user: true,
          },
        },
      },
    });

    if (!currentRefresh) {
      return { code: "INVALID_TOKEN" as const, ok: false as const };
    }

    const problem = getRefreshSessionProblem(
      {
        accessExpiresAt: currentRefresh.session.accessExpiresAt,
        deviceInstallationId:
          currentRefresh.session.device.installationId,
        expectedInstallationId,
        refreshConsumedAt: currentRefresh.consumedAt,
        refreshExpiresAt: currentRefresh.expiresAt,
        revokedAt: currentRefresh.session.revokedAt,
        sessionVersion: currentRefresh.session.sessionVersion,
        userIsActive: currentRefresh.session.user.isActive,
        userSessionVersion: currentRefresh.session.user.sessionVersion,
      },
      now,
    );

    if (problem) {
      if (problem !== "SESSION_REVOKED") {
        await tx.mobileSession.update({
          where: { id: currentRefresh.sessionId },
          data: {
            revokedAt: currentRefresh.session.revokedAt ?? now,
            revokeReason: problem,
          },
        });
      }

      return { code: problem, ok: false as const };
    }

    const replacement = await tx.mobileRefreshToken.create({
      data: {
        expiresAt: refreshExpiresAt,
        sessionId: currentRefresh.sessionId,
        tokenHash: nextRefresh.hash,
      },
    });

    await tx.mobileRefreshToken.update({
      where: { id: currentRefresh.id },
      data: {
        consumedAt: now,
        replacedByTokenId: replacement.id,
      },
    });

    await tx.mobileSession.update({
      where: { id: currentRefresh.sessionId },
      data: {
        accessExpiresAt,
        accessTokenHash: nextAccess.hash,
        lastUsedAt: now,
      },
    });

    await tx.mobileDevice.update({
      where: { id: currentRefresh.session.deviceId },
      data: { lastSeenAt: now },
    });

    return {
      ok: true as const,
      user: toMobileUser(currentRefresh.session.user),
    };
  });

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    tokens: {
      accessExpiresAt,
      accessToken: nextAccess.value,
      refreshExpiresAt,
      refreshToken: nextRefresh.value,
    },
    user: result.user,
  };
}
