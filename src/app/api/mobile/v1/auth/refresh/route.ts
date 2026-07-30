import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { serializeMobileAuthSuccess } from "@/lib/mobile-auth/payload";
import { mobileRefreshSchema } from "@/lib/mobile-auth/schemas";
import { rotateMobileRefreshToken } from "@/lib/mobile-auth/session-issuer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = getMobileRequestId(request);

  try {
    const body = await request.json().catch(() => null);
    const parsed = mobileRefreshSchema.safeParse(body);

    if (!parsed.success) {
      return mobileError(
        "INVALID_REQUEST",
        "Confira os dados enviados.",
        400,
        requestId,
      );
    }

    const result = await rotateMobileRefreshToken(
      parsed.data.refreshToken,
      parsed.data.installationId,
    );

    if (!result.ok) {
      console.warn("Mobile refresh rejected.", {
        reason: result.code,
        requestId,
      });

      return mobileError(
        "SESSION_INVALID",
        "Entre novamente para continuar.",
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
    console.error("Mobile refresh failed.", { error, requestId });

    return mobileError(
      "INTERNAL_ERROR",
      "Não foi possível renovar a sessão.",
      500,
      requestId,
    );
  }
}
