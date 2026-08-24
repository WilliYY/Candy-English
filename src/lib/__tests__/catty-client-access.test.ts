import assert from "node:assert/strict";
import test from "node:test";

import {
  canUseLoggedInCattyChat,
  resolveCattyPageContext,
} from "@/lib/catty-client-access";
import type { Role } from "@/lib/roles";

const authenticatedModules: Array<{
  area: "admin" | "teacher" | "student";
  pathname: string;
  role: Role;
  task: string;
}> = [
  { area: "admin", pathname: "/ava/escolha", role: "ADMIN", task: "escolha" },
  {
    area: "teacher",
    pathname: "/ava/escolha",
    role: "TEACHER",
    task: "escolha",
  },
  {
    area: "admin",
    pathname: "/ava/secretaria",
    role: "ADMIN",
    task: "secretaria",
  },
  {
    area: "teacher",
    pathname: "/ava/secretaria",
    role: "TEACHER",
    task: "secretaria",
  },
  { area: "admin", pathname: "/ava/vendas", role: "ADMIN", task: "vendas" },
  {
    area: "teacher",
    pathname: "/ava/vendas",
    role: "TEACHER",
    task: "vendas",
  },
  { area: "admin", pathname: "/ava/ponto", role: "ADMIN", task: "ponto" },
  {
    area: "teacher",
    pathname: "/ava/ponto",
    role: "TEACHER",
    task: "ponto",
  },
  {
    area: "student",
    pathname: "/ava/student",
    role: "STUDENT",
    task: "homeworks",
  },
  {
    area: "admin",
    pathname: "/ava/modulo-futuro",
    role: "ADMIN",
    task: "modulo-futuro",
  },
];

test("resolves every authenticated AVA module through the real user role", () => {
  for (const scenario of authenticatedModules) {
    const context = resolveCattyPageContext({
      pathname: scenario.pathname,
      role: scenario.role,
      search: scenario.task === "homeworks" ? "?task=homeworks" : "",
    });

    assert.equal(context.area, scenario.area, scenario.pathname);
    assert.equal(context.task, scenario.task, scenario.pathname);
    assert.equal(
      canUseLoggedInCattyChat({ context, hasSessionUser: true }),
      true,
      scenario.pathname,
    );
  }
});

test("keeps public, login and unauthenticated AVA contexts separated", () => {
  assert.deepEqual(
    resolveCattyPageContext({ pathname: "/", role: null, search: "" }),
    { area: "site", task: undefined },
  );
  assert.deepEqual(
    resolveCattyPageContext({
      pathname: "/available",
      role: "ADMIN",
      search: "",
    }),
    { area: "site", task: undefined },
  );
  assert.deepEqual(
    resolveCattyPageContext({
      pathname: "/ava/login",
      role: "ADMIN",
      search: "",
    }),
    { area: "login", task: undefined },
  );

  const unauthenticatedAva = resolveCattyPageContext({
    pathname: "/ava/escolha",
    role: null,
    search: "",
  });

  assert.deepEqual(unauthenticatedAva, {
    area: "unknown",
    task: "escolha",
  });
  assert.equal(
    canUseLoggedInCattyChat({
      context: unauthenticatedAva,
      hasSessionUser: false,
    }),
    false,
  );
});
