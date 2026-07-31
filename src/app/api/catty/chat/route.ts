import type { NextRequest } from "next/server";

import {
  type AuthenticatedCattyUser,
  handleCattyChatRequest,
  handleCattyHistoryRequest,
} from "@/lib/catty-chat-handler";
import { auth } from "@/lib/auth";
import { isRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAuthenticatedCattyUser(): Promise<AuthenticatedCattyUser | null> {
  const session = await auth();

  if (!session?.user?.id || !isRole(session.user.role)) {
    return null;
  }

  return {
    email: session.user.email,
    id: session.user.id,
    name: session.user.name,
    role: session.user.role,
  };
}

export async function GET(request: NextRequest) {
  return handleCattyHistoryRequest(request, await getAuthenticatedCattyUser());
}

export async function POST(request: NextRequest) {
  return handleCattyChatRequest(request, await getAuthenticatedCattyUser());
}
