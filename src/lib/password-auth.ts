import { compare } from "bcryptjs";

import { isMaintenanceModeEnabled } from "@/lib/app-settings";
import { acquireTransactionAdvisoryLock } from "@/lib/postgres-advisory-lock";
import { getPrisma } from "@/lib/prisma";
import type { Role } from "@/lib/roles";
import type { LoginInput } from "@/lib/validations/auth";

const LOGIN_WINDOW_MINUTES = 15;
const LOGIN_MAX_FAILURES = 8;
const LOGIN_MAX_IP_FAILURES = 30;
const DUMMY_PASSWORD_HASH =
  "$2b$12$AkGmRH3KHezo64Lo0iexO.BkYlIWGgPih3LpM9wDjpdBCA7ex.6Gu";

export type PasswordAuthenticatedUser = {
  email: string;
  id: string;
  name: string;
  role: Role;
  sessionVersion: number;
};

export async function authenticatePasswordCredentials(
  input: LoginInput,
  options: { ipHash?: string | null } = {},
): Promise<PasswordAuthenticatedUser | null> {
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    await acquireTransactionAdvisoryLock(tx, `login:${input.email}`);

    if (options.ipHash) {
      await acquireTransactionAdvisoryLock(tx, `login-ip:${options.ipHash}`);
    }

    const now = Date.now();
    const windowStart = new Date(now - LOGIN_WINDOW_MINUTES * 60 * 1000);

    await tx.loginAttempt.deleteMany({
      where: {
        createdAt: {
          lt: new Date(now - 24 * 60 * 60 * 1000),
        },
      },
    });

    const [accountFailures, ipFailures] = await Promise.all([
      tx.loginAttempt.count({
        where: {
          createdAt: {
            gte: windowStart,
          },
          email: input.email,
          success: false,
        },
      }),
      options.ipHash
        ? tx.loginAttempt.count({
            where: {
              createdAt: {
                gte: windowStart,
              },
              ipHash: options.ipHash,
              success: false,
            },
          })
        : Promise.resolve(0),
    ]);

    if (
      accountFailures >= LOGIN_MAX_FAILURES ||
      ipFailures >= LOGIN_MAX_IP_FAILURES
    ) {
      return null;
    }

    const user = await tx.user.findUnique({
      where: { email: input.email },
    });
    const passwordMatches = await compare(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    const blockedByMaintenance =
      user?.role === "STUDENT" && (await isMaintenanceModeEnabled());
    const success = Boolean(
      user?.isActive && passwordMatches && !blockedByMaintenance,
    );

    await tx.loginAttempt.create({
      data: {
        email: input.email,
        ipHash: options.ipHash,
        success,
      },
    });

    if (!success || !user) {
      return null;
    }

    return {
      email: user.email,
      id: user.id,
      name: user.name,
      role: user.role,
      sessionVersion: user.sessionVersion,
    };
  });
}
