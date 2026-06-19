import { getPrisma } from "@/lib/prisma";

export const SITE_VISIT_COUNTER_KEY = "public_site_total";

const BOT_USER_AGENT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /slurp/i,
  /bingpreview/i,
  /facebookexternalhit/i,
  /whatsapp/i,
  /telegrambot/i,
  /discordbot/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /headless/i,
  /lighthouse/i,
];

export function isLikelyBotUserAgent(userAgent: string | null) {
  if (!userAgent) {
    return true;
  }

  return BOT_USER_AGENT_PATTERNS.some((pattern) => pattern.test(userAgent));
}

export function isPublicSitePath(pathname: string | null | undefined) {
  if (!pathname) {
    return true;
  }

  return (
    pathname === "/" ||
    pathname.startsWith("/sobre") ||
    pathname.startsWith("/metodologia") ||
    pathname.startsWith("/planos") ||
    pathname.startsWith("/contato")
  );
}

export async function getSiteVisitTotal() {
  const prisma = getPrisma();
  const counter = await prisma.siteVisitCounter.findUnique({
    where: {
      key: SITE_VISIT_COUNTER_KEY,
    },
    select: {
      total: true,
    },
  });

  return counter?.total ?? 0;
}

export async function incrementSiteVisitTotal() {
  const prisma = getPrisma();
  const counter = await prisma.siteVisitCounter.upsert({
    where: {
      key: SITE_VISIT_COUNTER_KEY,
    },
    create: {
      key: SITE_VISIT_COUNTER_KEY,
      total: 1,
    },
    update: {
      total: {
        increment: 1,
      },
    },
    select: {
      total: true,
    },
  });

  return counter.total;
}
