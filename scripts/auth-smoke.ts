import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

type SmokeRole = "ADMIN" | "TEACHER" | "STUDENT";

const baseUrl = process.env.AUDIT_BASE_URL ?? "http://localhost:3000";
const databaseUrl = process.env.DATABASE_URL;
const roles: SmokeRole[] = ["ADMIN", "TEACHER", "STUDENT"];
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const testPassword = `CandySmoke-${runId}`;

if (!databaseUrl) {
  throw new Error("DATABASE_URL precisa estar definido para auth-smoke.");
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const testEmails = roles.map(
  (role) => `codex-smoke-${role.toLowerCase()}-${runId}@example.com`,
);

function getDefaultAvaPath(role: SmokeRole) {
  if (role === "ADMIN" || role === "TEACHER") return "/ava/escolha";
  return "/ava/student";
}

function buildUrl(path: string) {
  return new URL(path, baseUrl).toString();
}

function assertNoServerException(path: string, response: Response, text: string) {
  if (text.includes("server-side exception") || text.includes("Application error")) {
    throw new Error(`${path} renderizou erro server-side.`);
  }

  if (response.status >= 500) {
    throw new Error(`${path} retornou HTTP ${response.status}.`);
  }
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

async function createSmokeUser(role: SmokeRole, email: string) {
  const passwordHash = await hash(testPassword, 12);

  await prisma.user.create({
    data: {
      email,
      isActive: true,
      name: `Codex Smoke ${role}`,
      passwordHash,
      role,
      ...(role === "TEACHER"
        ? {
            teacherProfile: {
              create: {
                bio: "Perfil temporario de teste de login.",
              },
            },
          }
        : {}),
      ...(role === "STUDENT"
        ? {
            studentProfile: {
              create: {
                level: "Teste",
                notes: "Perfil temporario de teste de login.",
              },
            },
          }
        : {}),
    },
  });
}

async function signInWithCredentials(email: string) {
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

async function assertRoleRedirect(role: SmokeRole, cookie: string) {
  const response = await fetch(buildUrl("/ava"), {
    headers: { cookie },
    redirect: "manual",
  });
  const location = response.headers.get("location");
  const expectedPath = getDefaultAvaPath(role);

  if (
    ![302, 303, 307, 308].includes(response.status) ||
    !location?.includes(expectedPath)
  ) {
    throw new Error(
      `Role ${role} esperava redirecionar para ${expectedPath}, recebeu ${response.status} ${location ?? ""}`,
    );
  }

  console.log(`OK login ${role.toLowerCase()} -> ${expectedPath}`);
}

async function assertSecretariaPermissions(role: SmokeRole, cookie: string) {
  const response = await fetch(buildUrl("/ava/secretaria"), {
    headers: { cookie },
    redirect: "manual",
  });
  const location = response.headers.get("location");

  if (role === "STUDENT") {
    if (
      ![302, 303, 307, 308].includes(response.status) ||
      !location?.includes("/ava/student")
    ) {
      throw new Error(
        `Student nao deve acessar Secretaria, recebeu ${response.status} ${location ?? ""}`,
      );
    }

    console.log("OK secretaria blocks student");
    return;
  }

  if (!response.ok) {
    throw new Error(
      `${role} esperava acessar Secretaria, recebeu HTTP ${response.status}`,
    );
  }

  const text = await response.text();
  assertNoServerException("/ava/secretaria", response, text);

  if (role === "ADMIN") {
    const requiredAdminLinks = [
      "/ava/admin?task=aceitar-alunos",
      "/ava/admin?task=financeiro",
      "/ava/admin?task=agenda",
      "/ava/admin?task=apis-senhas",
    ];

    for (const link of requiredAdminLinks) {
      if (!text.includes(link)) {
        throw new Error(`Secretaria admin sem atalho esperado: ${link}`);
      }
    }

    console.log("OK secretaria admin complete");
    return;
  }

  const forbiddenTeacherLinks = [
    "/ava/admin?task=financeiro",
    "/ava/admin?task=agenda",
    "/ava/admin?task=apis-senhas",
  ];

  if (!text.includes("/ava/teacher?task=aceitar-alunos")) {
    throw new Error("Secretaria teacher sem atalho de pre-cadastros.");
  }

  for (const link of forbiddenTeacherLinks) {
    if (text.includes(link)) {
      throw new Error(`Secretaria teacher vazou atalho admin: ${link}`);
    }
  }

  console.log("OK secretaria teacher limited");
}

async function assertAreaChoiceShell(role: SmokeRole, cookie: string) {
  if (role === "STUDENT") {
    return;
  }

  const response = await fetch(buildUrl("/ava/escolha"), {
    headers: { cookie },
    redirect: "manual",
  });

  if (!response.ok) {
    throw new Error(`${role} esperava acessar escolha, recebeu ${response.status}`);
  }

  const text = await response.text();
  assertNoServerException("/ava/escolha", response, text);
  const forbiddenShellText = [
    "Area de trabalho",
    "Admin AVA",
    "Teacher AVA",
    "Painel Admin AVA",
    "Painel Teacher AVA",
    "Navegacao principal do AVA",
  ];

  for (const fragment of forbiddenShellText) {
    if (text.includes(fragment)) {
      throw new Error(`Tela de escolha vazou sidebar/atalho: ${fragment}`);
    }
  }

  if (!text.includes("Entrar no AVA") || !text.includes("Entrar na Secretaria")) {
    throw new Error("Tela de escolha sem cards AVA e Secretaria.");
  }

  console.log(`OK escolha limpa ${role.toLowerCase()}`);
}

async function assertPedagogicalWorkspace(role: SmokeRole, cookie: string) {
  const path =
    role === "ADMIN"
      ? "/ava/admin?task=usuarios"
      : role === "TEACHER"
        ? "/ava/teacher?task=resumo"
        : "/ava/student";
  const response = await fetch(buildUrl(path), {
    headers: { cookie },
    redirect: "manual",
  });

  if (!response.ok) {
    throw new Error(`${role} esperava acessar ${path}, recebeu ${response.status}`);
  }

  const text = await response.text();
  assertNoServerException(path, response, text);

  if (role === "ADMIN") {
    if (
      !text.includes("Admin AVA") ||
      text.includes("/ava/admin?task=financeiro")
    ) {
      throw new Error("Sidebar do AVA Admin veio incompleta ou misturada.");
    }

    const forbiddenAdminAvaLinks = [
      "/ava/admin?task=agenda",
      "/ava/admin?task=apis-senhas",
      "/ava/admin?task=financeiro",
    ];

    for (const link of forbiddenAdminAvaLinks) {
      if (text.includes(link)) {
        throw new Error(`AVA Admin vazou link de Secretaria: ${link}`);
      }
    }
  }

  if (role === "TEACHER") {
    if (
      !text.includes("Teacher AVA") ||
      text.includes("/ava/admin?task=financeiro")
    ) {
      throw new Error("Sidebar do AVA Teacher veio incompleta ou misturada.");
    }

    const forbiddenTeacherAvaFragments = [
      "/ava/admin?task=agenda",
      "/ava/admin?task=apis-senhas",
      "/ava/admin?task=financeiro",
      "Agenda interna",
      "Financeiro",
    ];

    for (const fragment of forbiddenTeacherAvaFragments) {
      if (text.includes(fragment)) {
        throw new Error(`AVA Teacher vazou item administrativo: ${fragment}`);
      }
    }
  }

  if (role === "STUDENT" && text.includes("Secretaria")) {
    throw new Error("Student recebeu atalho de Secretaria.");
  }

  console.log(`OK workspace pedagogico ${role.toLowerCase()}`);
}

async function assertAdminAvaTaskRoutes(role: SmokeRole, cookie: string) {
  if (role !== "ADMIN") {
    return;
  }

  const paths = [
    "/ava/admin?task=usuarios",
    "/ava/admin?task=aceitar-alunos",
    "/ava/admin?task=financeiro",
    "/ava/admin?task=financeiro&unit=all",
    "/ava/admin?task=financeiro&unit=IVATE",
    "/ava/admin?task=financeiro&unit=DOURADINA",
    "/ava/admin?task=agenda",
    "/ava/admin?task=agenda&unit=IVATE",
    "/ava/admin?task=agenda&unit=DOURADINA",
  ];

  for (const path of paths) {
    const response = await fetch(buildUrl(path), {
      headers: { cookie },
      redirect: "manual",
    });

    if (!response.ok) {
      throw new Error(`Admin esperava acessar ${path}, recebeu ${response.status}`);
    }

    const text = await response.text();
    assertNoServerException(path, response, text);
  }

  console.log("OK admin task routes");
}

async function assertTeacherAvaTaskRoutes(role: SmokeRole, cookie: string) {
  if (role !== "TEACHER") {
    return;
  }

  const paths = [
    "/ava/teacher?task=resumo",
    "/ava/teacher?task=aceitar-alunos",
    "/ava/teacher?task=aceitar-alunos&unit=IVATE",
    "/ava/teacher?task=aceitar-alunos&unit=DOURADINA",
  ];

  for (const path of paths) {
    const response = await fetch(buildUrl(path), {
      headers: { cookie },
      redirect: "manual",
    });

    if (!response.ok) {
      throw new Error(
        `Teacher esperava acessar ${path}, recebeu ${response.status}`,
      );
    }

    const text = await response.text();
    assertNoServerException(path, response, text);

    if (
      path.includes("aceitar-alunos") &&
      (text.includes("/ava/admin?task=financeiro") ||
        text.includes("/ava/admin?task=agenda") ||
        text.includes("/ava/admin?task=apis-senhas"))
    ) {
      throw new Error(`Teacher Secretaria vazou link admin em ${path}.`);
    }
  }

  console.log("OK teacher task routes");
}

async function assertStudentRoutes(role: SmokeRole, cookie: string) {
  if (role !== "STUDENT") {
    return;
  }

  const studentResponse = await fetch(buildUrl("/ava/student?task=resumo"), {
    headers: { cookie },
    redirect: "manual",
  });

  if (!studentResponse.ok) {
    throw new Error(
      `Student esperava acessar /ava/student?task=resumo, recebeu ${studentResponse.status}`,
    );
  }

  const studentText = await studentResponse.text();
  assertNoServerException(
    "/ava/student?task=resumo",
    studentResponse,
    studentText,
  );

  const escolhaResponse = await fetch(buildUrl("/ava/escolha"), {
    headers: { cookie },
    redirect: "manual",
  });
  const location = escolhaResponse.headers.get("location");

  if (
    ![302, 303, 307, 308].includes(escolhaResponse.status) ||
    !location?.includes("/ava/student")
  ) {
    throw new Error(
      `Student nao deve ver escolha, recebeu ${escolhaResponse.status} ${location ?? ""}`,
    );
  }

  console.log("OK student routes");
}

async function assertSecretariaUnitLinks(role: SmokeRole, cookie: string) {
  if (role === "STUDENT") {
    return;
  }

  const unitPaths = [
    { label: "todos", path: "/ava/secretaria" },
    { label: "ivate", path: "/ava/secretaria?unit=IVATE" },
    { label: "douradina", path: "/ava/secretaria?unit=DOURADINA" },
  ];

  for (const unitPath of unitPaths) {
    const response = await fetch(buildUrl(unitPath.path), {
      headers: { cookie },
      redirect: "manual",
    });

    if (!response.ok) {
      throw new Error(
        `${role} esperava acessar ${unitPath.path}, recebeu ${response.status}`,
      );
    }

    const text = await response.text();
    assertNoServerException(unitPath.path, response, text);

    if (text.includes("Admin AVA") || text.includes("Teacher AVA")) {
      throw new Error(`Secretaria misturou menu pedagogico em ${unitPath.path}.`);
    }

    if (role === "ADMIN") {
      const suffix = unitPath.path.includes("unit=")
        ? `&unit=${unitPath.path.split("unit=")[1]}`
        : "";
      const expectedLinks = [
        `/ava/admin?task=aceitar-alunos${suffix}`,
        `/ava/admin?task=financeiro${suffix}`,
        `/ava/admin?task=agenda${suffix}`,
      ];

      for (const link of expectedLinks) {
        if (!text.includes(link)) {
          throw new Error(`Secretaria admin sem link ${link} em ${unitPath.label}.`);
        }
      }
    }

    if (role === "TEACHER") {
      const suffix = unitPath.path.includes("unit=")
        ? `&unit=${unitPath.path.split("unit=")[1]}`
        : "";
      const expectedLink = `/ava/teacher?task=aceitar-alunos${suffix}`;

      if (!text.includes(expectedLink)) {
        throw new Error(`Secretaria teacher sem link ${expectedLink}.`);
      }

      for (const forbiddenLink of [
        "/ava/admin?task=financeiro",
        "/ava/admin?task=agenda",
        "/ava/admin?task=apis-senhas",
      ]) {
        if (text.includes(forbiddenLink)) {
          throw new Error(`Secretaria teacher vazou ${forbiddenLink}.`);
        }
      }
    }
  }

  console.log(`OK secretaria unit links ${role.toLowerCase()}`);
}

async function assertAnonymousProtectedRoutes() {
  const protectedPaths = [
    "/ava/admin",
    "/ava/teacher",
    "/ava/student",
    "/ava/escolha",
    "/ava/secretaria",
  ];

  for (const path of protectedPaths) {
    const response = await fetch(buildUrl(path), {
      redirect: "manual",
    });
    const location = response.headers.get("location");

    if (
      ![302, 303, 307, 308].includes(response.status) ||
      !location?.includes("/ava/login")
    ) {
      throw new Error(
        `Usuario sem login nao deve acessar ${path}, recebeu ${response.status} ${location ?? ""}`,
      );
    }
  }

  console.log("OK anonymous protected routes");
}

async function assertAdminOnlySecretariaTasks(role: SmokeRole, cookie: string) {
  if (role === "ADMIN") {
    return;
  }

  const protectedPaths = [
    "/ava/admin?task=financeiro",
    "/ava/admin?task=agenda",
    "/ava/admin?task=apis-senhas",
  ];
  const expectedPath = getDefaultAvaPath(role);

  for (const path of protectedPaths) {
    const response = await fetch(buildUrl(path), {
      headers: { cookie },
      redirect: "manual",
    });
    const location = response.headers.get("location");

    if (
      ![302, 303, 307, 308].includes(response.status) ||
      !location?.includes(expectedPath)
    ) {
      throw new Error(
        `Role ${role} nao deve acessar ${path}, recebeu ${response.status} ${location ?? ""}`,
      );
    }
  }

  console.log(`OK admin-only secretaria tasks block ${role.toLowerCase()}`);
}

async function reportGoogleProvider() {
  const response = await fetch(buildUrl("/api/auth/providers"));

  if (!response.ok) {
    throw new Error(`Providers retornou HTTP ${response.status}`);
  }

  const providers = (await response.json()) as Record<string, unknown>;

  if (providers.google) {
    console.log("OK google provider configured");
    return;
  }

  console.log("SKIP google provider not configured in this environment");
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
}

async function main() {
  await assertAnonymousProtectedRoutes();
  await cleanup();

  for (const [index, role] of roles.entries()) {
    const email = testEmails[index];

    await createSmokeUser(role, email);
    const cookie = await signInWithCredentials(email);
    await assertRoleRedirect(role, cookie);
    await assertAreaChoiceShell(role, cookie);
    await assertPedagogicalWorkspace(role, cookie);
    await assertSecretariaPermissions(role, cookie);
    await assertSecretariaUnitLinks(role, cookie);
    await assertAdminAvaTaskRoutes(role, cookie);
    await assertTeacherAvaTaskRoutes(role, cookie);
    await assertStudentRoutes(role, cookie);
    await assertAdminOnlySecretariaTasks(role, cookie);
  }

  await reportGoogleProvider();
  console.log("Candy English auth smoke OK");
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
