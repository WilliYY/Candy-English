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
const rankedEmail = `codex-avatar-ranked-${runId}@example.com`;
const privateEmail = `codex-avatar-private-${runId}@example.com`;
const testPassword = `CandyAvatar-${runId}`;
const testEmails = [testEmail, rankedEmail, privateEmail];
const savedAvatarPaths = new Set<string>();

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

async function signInWithCredentials(email = testEmail) {
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
    email,
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

async function createStudentWithAvatar(input: {
  email: string;
  name: string;
  totalXp?: number;
}) {
  const imageBuffer = await readFile("public/brand/catty.png");
  const avatar = await saveAvatarImage(
    new NodeFile([imageBuffer], "catty.png", {
      type: "image/png",
    }) as unknown as globalThis.File,
  );

  savedAvatarPaths.add(avatar.relativePath);

  const user = await prisma.user.create({
    data: {
      avatarMimeType: avatar.mimeType,
      avatarPath: avatar.relativePath,
      email: input.email,
      isActive: true,
      name: input.name,
      passwordHash: await hash(testPassword, 12),
      role: "STUDENT",
      candyXpProfile:
        input.totalXp && input.totalXp > 0
          ? {
              create: {
                progressXp: input.totalXp,
                role: "STUDENT",
                totalXp: input.totalXp,
              },
            }
          : undefined,
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

  return {
    avatarPath: avatar.relativePath,
    id: user.id,
  };
}

async function cleanup() {
  await prisma.loginAttempt.deleteMany({
    where: {
      email: {
        in: testEmails,
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      email: {
        in: testEmails,
      },
    },
  });

  for (const avatarPath of savedAvatarPaths) {
    await unlink(getStoragePath(avatarPath)).catch(() => undefined);
  }
}

async function main() {
  await cleanup();

  const viewer = await createStudentWithAvatar({
    email: testEmail,
    name: "Codex Avatar Viewer",
  });
  const rankedTarget = await createStudentWithAvatar({
    email: rankedEmail,
    name: "Codex Avatar Ranked",
    totalXp: 25,
  });
  const privateTarget = await createStudentWithAvatar({
    email: privateEmail,
    name: "Codex Avatar Private",
  });
  const cookie = await signInWithCredentials();
  const avatarResponse = await fetch(buildUrl(`/ava/avatar/${viewer.id}`), {
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

  const rankedAvatarResponse = await fetch(
    buildUrl(`/ava/avatar/${rankedTarget.id}`),
    {
      headers: { cookie },
    },
  );

  if (!rankedAvatarResponse.ok) {
    throw new Error(
      `Avatar de participante do ranking retornou HTTP ${rankedAvatarResponse.status}`,
    );
  }

  const cacheControl = rankedAvatarResponse.headers.get("cache-control") ?? "";

  if (!cacheControl.includes("private") || !cacheControl.includes("no-store")) {
    throw new Error(`Cache-Control inesperado no avatar: ${cacheControl}`);
  }

  const privateAvatarResponse = await fetch(
    buildUrl(`/ava/avatar/${privateTarget.id}`),
    {
      headers: { cookie },
    },
  );

  if (privateAvatarResponse.status !== 403) {
    throw new Error(
      `Avatar fora do ranking deveria retornar 403, recebeu ${privateAvatarResponse.status}`,
    );
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

  const updatedViewer = await prisma.user.findUniqueOrThrow({
    where: { id: viewer.id },
    select: { avatarPath: true },
  });

  if (!updatedViewer.avatarPath || updatedViewer.avatarPath === viewer.avatarPath) {
    throw new Error("Upload nao atualizou o caminho do avatar no banco.");
  }

  savedAvatarPaths.add(updatedViewer.avatarPath);

  try {
    await readFile(getStoragePath(viewer.avatarPath));
    throw new Error("Arquivo do avatar anterior nao foi removido.");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Arquivo do avatar anterior nao foi removido."
    ) {
      throw error;
    }

    if (
      typeof error !== "object" ||
      error === null ||
      !("code" in error) ||
      (error as { code?: string }).code !== "ENOENT"
    ) {
      throw error;
    }
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

  console.log(
    "OK avatar ranking visibility, private isolation, replacement cleanup and profile page",
  );
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
