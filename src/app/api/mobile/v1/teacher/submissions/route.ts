import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { getMobileTeacherSubmissionQueue } from "@/lib/mobile-teacher-submissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = getMobileRequestId(request);
  try {
    const token = parseBearerToken(request.headers.get("authorization"));
    const session = token ? await authorizeMobileAccess(token) : null;
    if (!session?.ok) {
      return mobileError(
        "SESSION_INVALID",
        "Entre novamente para continuar.",
        401,
        requestId,
      );
    }
    if (session.user.role !== "TEACHER") {
      return mobileError(
        "ROLE_FORBIDDEN",
        "Use uma conta de teacher para carregar as correcoes.",
        403,
        requestId,
      );
    }

    const result = await getMobileTeacherSubmissionQueue(session.user.id);
    if (!result.ok || !result.data) {
      return mobileError(
        "TEACHER_PROFILE_UNAVAILABLE",
        result.message,
        404,
        requestId,
      );
    }
    return mobileJson({ ...result.data, ok: true }, 200, requestId);
  } catch (error) {
    console.error("[mobile-teacher-submissions:list]", { error, requestId });
    return mobileError(
      "SUBMISSIONS_UNAVAILABLE",
      "Nao foi possivel carregar as correcoes agora.",
      503,
      requestId,
    );
  }
}
