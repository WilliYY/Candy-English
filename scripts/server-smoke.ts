const baseUrl = process.env.AUDIT_BASE_URL ?? "http://localhost:3000";
const REQUEST_TIMEOUT_MS = 15_000;

type SmokeCheck = {
  expect: (response: Response) => boolean | Promise<boolean>;
  name: string;
  path: string;
  redirect?: RequestRedirect;
};

const checks: SmokeCheck[] = [
  {
    name: "health",
    path: "/api/health",
    expect: async (response) => {
      const payload = (await response.json().catch(() => null)) as {
        checks?: {
          database?: boolean;
          storage?: boolean;
        };
        ok?: boolean;
      } | null;

      return (
        response.ok &&
        payload?.ok === true &&
        payload.checks?.database === true &&
        payload.checks?.storage === true
      );
    },
  },
  {
    name: "site home",
    path: "/",
    expect: (response) => response.ok,
  },
  {
    name: "ava login whatsapp cta",
    path: "/ava/login",
    expect: async (response) => {
      const text = await response.text();

      return (
        response.ok &&
        text.includes("Quero ser aluno Candy") &&
        text.includes("wa.me")
      );
    },
  },
  {
    name: "ava login",
    path: "/ava/login",
    expect: (response) => response.ok,
  },
  {
    name: "site sobre",
    path: "/sobre",
    expect: (response) => response.ok,
  },
  {
    name: "site metodologia",
    path: "/metodologia",
    expect: (response) => response.ok,
  },
  {
    name: "site planos",
    path: "/planos",
    expect: (response) => response.ok,
  },
  {
    name: "site contato",
    path: "/contato",
    expect: (response) => response.ok,
  },
  {
    name: "site visits",
    path: "/api/site-visits",
    expect: async (response) => {
      const payload = (await response.json().catch(() => null)) as {
        total?: number | null;
      } | null;

      return response.ok && typeof payload?.total === "number";
    },
  },
  {
    name: "unknown route",
    path: "/rota-que-nao-existe",
    expect: (response) => response.status === 404,
  },
  {
    name: "admin redirects to login",
    path: "/ava/admin",
    redirect: "manual",
    expect: (response) => {
      const location = response.headers.get("location");

      return (
        [302, 303, 307, 308].includes(response.status) &&
        Boolean(location?.includes("/ava/login"))
      );
    },
  },
];

function buildUrl(path: string) {
  return new URL(path, baseUrl).toString();
}

async function main() {
  for (const check of checks) {
    const response = await fetch(buildUrl(check.path), {
      redirect: check.redirect ?? "follow",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const passed = await check.expect(response);

    if (!passed) {
      throw new Error(
        `Smoke check failed: ${check.name} returned ${response.status}`,
      );
    }

    console.log(`OK ${check.name}`);
  }

  console.log("Candy English server smoke OK");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
