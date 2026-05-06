const baseUrl = process.env.AUDIT_BASE_URL ?? "http://localhost:3000";

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
    expect: (response) => response.ok,
  },
  {
    name: "site home",
    path: "/",
    expect: (response) => response.ok,
  },
  {
    name: "ava login",
    path: "/ava/login",
    expect: (response) => response.ok,
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
