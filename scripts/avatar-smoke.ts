import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { File as NodeFile } from "node:buffer";
import { readFile, unlink } from "node:fs/promises";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { getStoragePath, saveAvatarImage } from "../src/lib/storage";

const baseUrl = process.env.AUDIT_BASE_URL ?? "http://localhost:3000";
const databaseUrl = process.env.DATABASE_URL;
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const testEmail = `codex-avatar-smoke-${runId}@example.com`;
const testPassword = `CandyAvatar-${runId}`;
let savedAvatarPath: string | undefined;

if (!databaseUrl) {
  throw new Error("DATABASE_URL precisa estar definido para avatar-smoke.");
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function buildUrl(path: string) {
  return new URL(path, baseUrl).toString();
}

function getSetCookies(headers: Headers) {
  const headerWithCookies = headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headerWithCookies.getSetCookie === "function") {
    return headerWithCookies.getSetCookie();
  }

  const setCookie = headers.get("set-cookie");

  return setCookie ? [setCookie] : [];
}

function cookieHeaderFrom(headers: Headers) {
  return getSetCookies(headers)
    .map((cookie) => cookie.split(";")[0])
    .filter(Boolean)
    .join("; ");
}

async function signInWithCredentials() {
  const csrfResponse = await fetch(buildUrl("/api/auth/csrf"));

  if (!csrfResponse.ok) {
    throw new Error(`CSRF retornou HTTP ${csrfResponse.status}`);
  }

  const csrfBody = (await csrfResponse.json()) as { csrfToken?: string };
  const csrfToken = csrfBody.csrfToken;

  if (!csrfToken) {
    throw new Error("CSRF token nao retornou.");
  }

  const csrfCookies = cookieHeaderFrom(csrfResponse.headers);
  const body = new URLSearchParams({
    csrfToken,
    email: testEmail,
    json: "true",
    password: testPassword,
  });

  const loginResponse = await fetch(buildUrl("/api/auth/callback/credentials"), {
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: csrfCookies,
    },
    method: "POST",
    redirect: "manual",
  });

  const sessionCookies = cookieHeaderFrom(loginResponse.headers);
  const cookie = [csrfCookies, sessionCookies].filter(Boolean).join("; ");

  if (![200, 302, 303, 307].includes(loginResponse.status) || !cookie) {
    throw new Error(`Login retornou HTTP ${loginResponse.status}`);
  }

  return cookie;
}

async function createStudentWithAvatar() {
  const imageBuffer = await readFile("public/brand/catty.png");
  const avatar = await saveAvatarImage(
    new NodeFile([imageBuffer], "catty.png", {
      type: "image/png",
    }) as unknown as globalThis.File,
  );

  savedAvatarPath = avatar.relativePath;

  const user = await prisma.user.create({
    data: {
      avatarMimeType: avatar.mimeType,
      avatarPath: avatar.relativePath,
      email: testEmail,
      isActive: true,
      name: "Codex Avatar Smoke",
      passwordHash: await hash(testPassword, 12),
      role: "STUDENT",
      studentProfile: {
        create: {
          level: "Teste",
          notes: "Perfil temporario para validar avatar.",
        },
      },
    },
    select: {
      id: true,
    },
  });

  return user.id;
}

async function cleanup() {
  await prisma.loginAttempt.deleteMany({ where: { email: testEmail } });
  await prisma.user.deleteMany({ where: { email: testEmail } });

  if (savedAvatarPath) {
    await unlink(getStoragePath(savedAvatarPath)).catch(() => undefined);
  }
}

async function main() {
  await cleanup();

  const userId = await createStudentWithAvatar();
  const cookie = await signInWithCredentials();
  const avatarResponse = await fetch(buildUrl(`/ava/avatar/${userId}`), {
    headers: { cookie },
  });

  if (!avatarResponse.ok) {
    throw new Error(`Avatar retornou HTTP ${avatarResponse.status}`);
  }

  const contentType = avatarResponse.headers.get("content-type") ?? "";

  if (!contentType.includes("image/png")) {
    throw new Error(`Avatar retornou content-type inesperado: ${contentType}`);
  }

  const body = await avatarResponse.arrayBuffer();

  if (body.byteLength < 1000) {
    throw new Error("Avatar retornou arquivo pequeno demais para a imagem de teste.");
  }

  const uploadImageBuffer = await readFile("public/brand/catty.png");
  const formData = new FormData();
  formData.append(
    "avatar",
    new NodeFile([uploadImageBuffer], "catty-upload.png", {
      type: "image/png",
    }) as unknown as Blob,
  );

  const uploadResponse = await fetch(buildUrl("/ava/avatar"), {
    body: formData,
    headers: { cookie },
    method: "POST",
  });

  if (!uploadResponse.ok) {
    throw new Error(`Upload de avatar retornou HTTP ${uploadResponse.status}`);
  }

  const uploadBody = (await uploadResponse.json()) as {
    ok?: boolean;
  };

  if (!uploadBody.ok) {
    throw new Error("Upload de avatar nao retornou ok=true.");
  }

  const profileResponse = await fetch(buildUrl("/ava/student?task=perfil"), {
    headers: { cookie },
  });

  if (!profileResponse.ok) {
    throw new Error(`Perfil student retornou HTTP ${profileResponse.status}`);
  }

  const profileHtml = await profileResponse.text();

  if (profileHtml.includes("Application error")) {
    throw new Error("Perfil student renderizou erro de aplicacao.");
  }

  console.log("OK avatar upload storage, protected route and student profile page");
}

main()
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
    await pool.end();
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
