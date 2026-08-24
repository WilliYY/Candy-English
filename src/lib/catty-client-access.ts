import type { CattyPageContext } from "./catty";
import type { Role } from "./roles";

type ResolveCattyPageContextInput = {
  pathname: string;
  role?: Role | null;
  search?: string;
};

function getRoleArea(role?: Role | null): CattyPageContext["area"] {
  if (role === "ADMIN") return "admin";
  if (role === "TEACHER") return "teacher";
  if (role === "STUDENT") return "student";
  return "unknown";
}

function getAvaModuleTask(pathname: string) {
  const moduleName = pathname.match(/^\/ava\/([^/?#]+)/)?.[1];

  if (!moduleName || ["admin", "login", "student", "teacher"].includes(moduleName)) {
    return undefined;
  }

  return moduleName.slice(0, 80);
}

export function resolveCattyPageContext({
  pathname,
  role,
  search = "",
}: ResolveCattyPageContextInput): CattyPageContext {
  const queryTask =
    new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      .get("task")
      ?.trim()
      .slice(0, 80) || undefined;

  if (pathname === "/ava/login" || pathname.startsWith("/ava/login/")) {
    return { area: "login", task: queryTask };
  }

  for (const area of ["admin", "teacher", "student"] as const) {
    if (pathname === `/ava/${area}` || pathname.startsWith(`/ava/${area}/`)) {
      return { area, task: queryTask };
    }
  }

  if (pathname === "/ava" || pathname.startsWith("/ava/")) {
    return {
      area: getRoleArea(role),
      task: queryTask ?? getAvaModuleTask(pathname),
    };
  }

  return { area: "site", task: queryTask };
}

export function isLoggedInAvaCattyArea(context: CattyPageContext) {
  return (
    context.area === "admin" ||
    context.area === "teacher" ||
    context.area === "student"
  );
}

export function isLoggedInCattyChatArea(context: CattyPageContext) {
  return context.area === "site" || isLoggedInAvaCattyArea(context);
}

export function isPublicCattyArea(context: CattyPageContext) {
  return context.area === "site" || context.area === "login";
}

export function canUseLoggedInCattyChat(input: {
  context: CattyPageContext;
  hasSessionUser: boolean;
}) {
  return input.hasSessionUser && isLoggedInCattyChatArea(input.context);
}
