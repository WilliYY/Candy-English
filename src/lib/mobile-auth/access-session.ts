import {
  MOBILE_LAST_USED_WRITE_INTERVAL_MS,
} from "@/lib/mobile-auth/config";
import type { MobileAuthFailure, MobileAuthUser } from "@/lib/mobile-auth/contracts";
import { getAccessSessionProblem } from "@/lib/mobile-auth/session-policy";
import {
  hashMobileToken,
  isAccessToken,
} from "@/lib/mobile-auth/tokens";
import { getPrisma } from "@/lib/prisma";

export type AuthorizedMobileSession = {
  deviceId: string;
  ok: true;
  sessionId: string;
  user: MobileAuthUser;
};

export async function authorizeMobileAccess(
  accessToken: string,
): Promise<AuthorizedMobileSession | MobileAuthFailure> {
  if (!isAccessToken(accessToken)) {
    return { code: "INVALID_TOKEN", ok: false };
  }

  const prisma = getPrisma();
  const now = new Date();
  const session = await prisma.mobileSession.findUnique({
    where: {
      accessTokenHash: hashMobileToken(accessToken),
    },
    include: {
      device: true,
      user: true,
    },
  });

  if (!session) {
    return { code: "INVALID_TOKEN", ok: false };
  }

  const problem = getAccessSessionProblem(
    {
      accessExpiresAt: session.accessExpiresAt,
      deviceInstallationId: session.device.installationId,
      expectedInstallationId: session.device.installationId,
      refreshConsumedAt: null,
      refreshExpiresAt: session.accessExpiresAt,
      revokedAt: session.revokedAt,
      sessionVersion: session.sessionVersion,
      userIsActive: session.user.isActive,
      userSessionVersion: session.user.sessionVersion,
    },
    now,
  );

  if (problem) {
    if (
      problem !== "ACCESS_EXPIRED" &&
      problem !== "SESSION_REVOKED"
    ) {
      await prisma.mobileSession.update({
        where: { id: session.id },
        data: {
          revokedAt: session.revokedAt ?? now,
          revokeReason: problem,
        },
      });
    }

    return { code: problem, ok: false };
  }

  if (
    session.lastUsedAt.getTime() <=
    now.getTime() - MOBILE_LAST_USED_WRITE_INTERVAL_MS
  ) {
    await prisma.$transaction([
      prisma.mobileSession.update({
        where: { id: session.id },
        data: { lastUsedAt: now },
      }),
      prisma.mobileDevice.update({
        where: { id: session.deviceId },
        data: { lastSeenAt: now },
      }),
    ]);
  }

  return {
    deviceId: session.deviceId,
    ok: true,
    sessionId: session.id,
    user: {
      email: session.user.email,
      id: session.user.id,
      name: session.user.name,
      role: session.user.role,
    },
  };
}

export async function revokeMobileSession(accessToken: string) {
  if (!isAccessToken(accessToken)) {
    return;
  }

  const prisma = getPrisma();

  await prisma.mobileSession.updateMany({
    where: {
      accessTokenHash: hashMobileToken(accessToken),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokeReason: "SIGNED_OUT",
    },
  });
}
