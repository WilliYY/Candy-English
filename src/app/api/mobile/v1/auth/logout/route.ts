import {
  getMobileRequestId,
  mobileNoContent,
} from "@/lib/mobile-auth/api-response";
import { revokeMobileSession } from "@/lib/mobile-auth/access-session";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = getMobileRequestId(request);
  const accessToken = parseBearerToken(request.headers.get("authorization"));

  if (accessToken) {
    await revokeMobileSession(accessToken);
  }

  return mobileNoContent(requestId);
}
