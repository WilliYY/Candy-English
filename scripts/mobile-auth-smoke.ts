import assert from "node:assert/strict";

import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { Pool } from "pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { hashMobileToken } from "../src/lib/mobile-auth/tokens";

type SmokeRole = "ADMIN" | "TEACHER" | "STUDENT";

type SessionPayload = {
  ok: true;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  user: {
    id: string;
    role: SmokeRole;
  };
};

const baseUrl = process.env.AUDIT_BASE_URL ?? "http://localhost:3000";
const databaseUrl = process.env.DATABASE_URL;
const roles: SmokeRole[] = ["ADMIN", "TEACHER", "STUDENT"];
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = `CandyMobile-${runId}`;
const emails = roles.map(
  (role) => `codex-mobile-${role.toLowerCase()}-${runId}@example.com`,
);

if (!databaseUrl) {
  throw new Error("DATABASE_URL precisa estar definido para mobile-auth-smoke.");
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function buildUrl(path: string) {
  return new URL(path, baseUrl).toString();
}

async function createUsers() {
  const passwordHash = await hash(password, 12);

  for (const [index, role] of roles.entries()) {
    await prisma.user.create({
      data: {
        email: emails[index],
        isActive: true,
        name: `Codex Mobile ${role}`,
        passwordHash,
        role,
      },
    });
  }
}

async function login(role: SmokeRole, suffix: string) {
  const email = emails[roles.indexOf(role)];
  const response = await fetch(buildUrl("/api/mobile/v1/auth/login"), {
    body: JSON.stringify({
      device: {
        appVersion: "0.1.0-smoke",
        installationId: `smoke-${runId}-${role}-${suffix}`,
        name: `Smoke ${role}`,
        platform: "ANDROID",
      },
      email,
      password,
    }),
    headers: {
      "content-type": "application/json",
      "x-request-id": `mobile-smoke-${runId}-${role}-${suffix}`,
    },
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as
    | SessionPayload
    | null;

  assert.equal(response.status, 200);
  assert.equal(payload?.ok, true);
  assert.equal(payload?.user.role, role);
  assert.match(payload?.tokens.accessToken ?? "", /^cea_/);
  assert.match(payload?.tokens.refreshToken ?? "", /^cer_/);

  return payload as SessionPayload;
}

async function assertMe(accessToken: string, expectedStatus: number) {
  const response = await fetch(buildUrl("/api/mobile/v1/auth/me"), {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  assert.equal(response.status, expectedStatus);
}

async function logout(accessToken: string) {
  const response = await fetch(buildUrl("/api/mobile/v1/auth/logout"), {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    method: "POST",
  });

  assert.equal(response.status, 204);
}

async function assertEveryRoleCanSignIn() {
  for (const role of roles) {
    const session = await login(role, "role");
    await assertMe(session.tokens.accessToken, 200);
    await logout(session.tokens.accessToken);
    await assertMe(session.tokens.accessToken, 401);
  }

  console.log("OK mobile login/me/logout for ADMIN, TEACHER and STUDENT");
}

async function assertRotationAndReplayRevocation() {
  const installationId = `smoke-${runId}-TEACHER-rotation`;
  const initial = await login("TEACHER", "rotation");
  const initialAccess = initial.tokens.accessToken;
  const initialRefresh = initial.tokens.refreshToken;
  const storedSession = await prisma.mobileSession.findUnique({
    where: {
      accessTokenHash: hashMobileToken(initialAccess),
    },
    include: {
      refreshTokens: true,
    },
  });

  assert.ok(storedSession);
  assert.notEqual(storedSession.accessTokenHash, initialAccess);
  assert.equal(
    storedSession.refreshTokens[0]?.tokenHash,
    hashMobileToken(initialRefresh),
  );

  const refreshResponse = await fetch(
    buildUrl("/api/mobile/v1/auth/refresh"),
    {
      body: JSON.stringify({
        installationId,
        refreshToken: initialRefresh,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );
  const rotated = (await refreshResponse.json()) as SessionPayload;

  assert.equal(refreshResponse.status, 200);
  await assertMe(initialAccess, 401);
  await assertMe(rotated.tokens.accessToken, 200);

  const replayResponse = await fetch(
    buildUrl("/api/mobile/v1/auth/refresh"),
    {
      body: JSON.stringify({
        installationId,
        refreshToken: initialRefresh,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );

  assert.equal(replayResponse.status, 401);
  await assertMe(rotated.tokens.accessToken, 401);
  console.log("OK mobile refresh rotation and replay revocation");
}

async function assertSessionVersionRevocation() {
  const session = await login("TEACHER", "session-version");
  const teacherEmail = emails[roles.indexOf("TEACHER")];

  await prisma.user.update({
    where: { email: teacherEmail },
    data: {
      sessionVersion: {
        increment: 1,
      },
    },
  });

  await assertMe(session.tokens.accessToken, 401);
  console.log("OK mobile sessionVersion revocation");
}

async function cleanup() {
  await prisma.loginAttempt.deleteMany({
    where: {
      email: {
        in: emails,
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      email: {
        in: emails,
      },
    },
  });
}

async function main() {
  await cleanup();
  await createUsers();
  await assertEveryRoleCanSignIn();
  await assertRotationAndReplayRevocation();
  await assertSessionVersionRevocation();
}

main()
  .then(() => {
    console.log("Mobile auth smoke passed.");
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
    await pool.end();
  });
