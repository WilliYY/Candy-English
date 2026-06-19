import { type NextRequest, NextResponse } from "next/server";
import {
  getSiteVisitTotal,
  incrementSiteVisitTotal,
  isLikelyBotUserAgent,
  isPublicSitePath,
} from "@/lib/site-visits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
};

async function readPathname(request: NextRequest) {
  try {
    const payload: unknown = await request.json();

    if (
      payload &&
      typeof payload === "object" &&
      "pathname" in payload &&
      typeof payload.pathname === "string"
    ) {
      return payload.pathname;
    }
  } catch {
    return null;
  }

  return null;
}

export async function GET() {
  try {
    const total = await getSiteVisitTotal();

    return NextResponse.json({ total }, { headers: JSON_HEADERS });
  } catch {
    return NextResponse.json({ total: null }, { headers: JSON_HEADERS });
  }
}

export async function POST(request: NextRequest) {
  try {
    const pathname = await readPathname(request);
    const userAgent = request.headers.get("user-agent");
    const shouldCount =
      isPublicSitePath(pathname) && !isLikelyBotUserAgent(userAgent);
    const total = shouldCount
      ? await incrementSiteVisitTotal()
      : await getSiteVisitTotal();

    return NextResponse.json(
      {
        counted: shouldCount,
        total,
      },
      { headers: JSON_HEADERS },
    );
  } catch {
    return NextResponse.json(
      {
        counted: false,
        total: null,
      },
      { headers: JSON_HEADERS },
    );
  }
}
