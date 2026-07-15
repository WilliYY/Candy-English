import type { CattyPageContext } from "./catty";

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
