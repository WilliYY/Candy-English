import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { serializeMobileAuthSuccess } from "@/lib/mobile-auth/payload";
import { mobileLoginSchema } from "@/lib/mobile-auth/schemas";
import { createMobileSession } from "@/lib/mobile-auth/session-issuer";
import { getLoginIpHash } from "@/lib/login-request-security";
import { authenticatePasswordCredentials } from "@/lib/password-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = getMobileRequestId(request);

  try {
    const body = await request.json().catch(() => null);
    const parsed = mobileLoginSchema.safeParse(body);

    if (!parsed.success) {
      return mobileError(
        "INVALID_REQUEST",
        "Confira os dados enviados.",
        400,
        requestId,
      );
    }

    const user = await authenticatePasswordCredentials(parsed.data, {
      ipHash: getLoginIpHash(request.headers),
    });

    if (!user) {
      return mobileError(
        "AUTHENTICATION_FAILED",
        "Email, senha ou código de segurança inválidos.",
        401,
        requestId,
      );
    }

    const result = await createMobileSession(user, parsed.data.device);

    if (!result.ok) {
      return mobileError(
        "SESSION_INVALID",
        "Não foi possível iniciar a sessão.",
        401,
        requestId,
      );
    }

    return mobileJson(
      serializeMobileAuthSuccess(result),
      200,
      requestId,
    );
  } catch (error) {
    console.error("Mobile login failed.", { error, requestId });

    return mobileError(
      "INTERNAL_ERROR",
      "Não foi possível entrar agora.",
      500,
      requestId,
    );
  }
}
