import { compare } from "bcryptjs";
import NextAuth, { type NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { isMaintenanceModeEnabled } from "@/lib/app-settings";
import { acquireTransactionAdvisoryLock } from "@/lib/postgres-advisory-lock";
import { getPrisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import { loginSchema } from "@/lib/validations/auth";

const LOGIN_WINDOW_MINUTES = 15;
const LOGIN_MAX_FAILURES = 8;

async function getActiveUserByEmail(email: string) {
  const prisma = getPrisma();

  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      email: true,
      id: true,
      isActive: true,
      name: true,
      role: true,
      sessionVersion: true,
    },
  });
}

async function getSessionUserById(id: string) {
  const prisma = getPrisma();

  return prisma.user.findUnique({
    where: { id },
    select: {
      email: true,
      id: true,
      isActive: true,
      name: true,
      role: true,
      sessionVersion: true,
    },
  });
}

function revokeToken(token: JWT) {
  delete token.id;
  delete token.role;
  delete token.sessionVersion;
}

const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Senha", type: "password" },
    },
    authorize: async (credentials) => {
      const parsed = loginSchema.safeParse(credentials);

      if (!parsed.success) {
        return null;
      }

      const { email, password } = parsed.data;
      const prisma = getPrisma();

      return prisma.$transaction(async (tx) => {
        await acquireTransactionAdvisoryLock(tx, `login:${email}`);

        const now = Date.now();
        const windowStart = new Date(
          now - LOGIN_WINDOW_MINUTES * 60 * 1000,
        );

        await tx.loginAttempt.deleteMany({
          where: {
            createdAt: {
              lt: new Date(now - 24 * 60 * 60 * 1000),
            },
          },
        });

        const failures = await tx.loginAttempt.count({
          where: {
            createdAt: {
              gte: windowStart,
            },
            email,
            success: false,
          },
        });

        if (failures >= LOGIN_MAX_FAILURES) {
          return null;
        }

        const user = await tx.user.findUnique({
          where: { email },
        });
        const passwordMatches = user
          ? await compare(password, user.passwordHash)
          : false;
        const blockedByMaintenance =
          user?.role === "STUDENT" && (await isMaintenanceModeEnabled());
        const success = Boolean(
          user?.isActive && passwordMatches && !blockedByMaintenance,
        );

        await tx.loginAttempt.create({
          data: {
            email,
            success,
          },
        });

        if (!success || !user) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          sessionVersion: user.sessionVersion,
        };
      });
    },
  }),
];

export const authConfig = {
  pages: {
    signIn: "/ava/login",
  },
  session: {
    strategy: "jwt",
  },
  providers,
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider === "credentials") {
        return true;
      }

      const email = user.email ?? profile?.email;

      if (!email) {
        return false;
      }

      const existingUser = await getActiveUserByEmail(email);

      if (
        existingUser?.role === "STUDENT" &&
        (await isMaintenanceModeEnabled())
      ) {
        return false;
      }

      return Boolean(existingUser?.isActive);
    },
    async jwt({ account, profile, token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.sessionVersion = user.sessionVersion;
      }

      if (account?.provider && account.provider !== "credentials") {
        const email = user?.email ?? profile?.email ?? token.email;

        if (email) {
          const existingUser = await getActiveUserByEmail(email);

          if (existingUser?.isActive) {
            token.id = existingUser.id;
            token.name = existingUser.name;
            token.email = existingUser.email;
            token.role = existingUser.role;
            token.sessionVersion = existingUser.sessionVersion;
          }
        }
      }

      if (typeof token.id === "string") {
        const sessionUser = await getSessionUserById(token.id);

        if (!sessionUser?.isActive) {
          revokeToken(token);
          return token;
        }

        const tokenSessionVersion =
          typeof token.sessionVersion === "number"
            ? token.sessionVersion
            : sessionUser.sessionVersion;

        if (
          tokenSessionVersion !== sessionUser.sessionVersion ||
          token.role !== sessionUser.role
        ) {
          revokeToken(token);
          return token;
        }

        token.name = sessionUser.name;
        token.email = sessionUser.email;
        token.role = sessionUser.role;
        token.sessionVersion = sessionUser.sessionVersion;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const tokenId = typeof token.id === "string" ? token.id : token.sub;

        session.user.id = tokenId ?? "";
        if (isRole(token.role)) {
          session.user.role = token.role;
        }
      }

      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
