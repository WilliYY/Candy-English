import { revalidatePath } from "next/cache";

import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { createMobileTeacherCattyLearning } from "@/lib/mobile-teacher-catty";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = getMobileRequestId(request);
  try {
    const token = parseBearerToken(request.headers.get("authorization"));
    const authorization = token ? await authorizeMobileAccess(token) : null;
    if (!authorization?.ok) {
      return mobileError(
        "SESSION_INVALID",
        "Entre novamente para continuar.",
        401,
        requestId,
      );
    }
    if (authorization.user.role !== "TEACHER") {
      return mobileError(
        "ROLE_FORBIDDEN",
        "Use uma conta de teacher para sugerir aprendizados.",
        403,
        requestId,
      );
    }

    const result = await createMobileTeacherCattyLearning(
      authorization.user.id,
      await request.json().catch(() => null),
    );
    if (!result.ok) {
      const status =
        result.code === "TEACHER_PROFILE_UNAVAILABLE"
          ? 404
          : result.code === "CATEGORY_FORBIDDEN"
            ? 403
            : 400;
      return mobileError(result.code, result.message, status, requestId);
    }

    revalidatePath("/ava/admin");
    revalidatePath("/ava/teacher");
    return mobileJson({ message: result.message, ok: true }, 201, requestId);
  } catch (error) {
    console.error("[mobile-teacher-catty:learning]", { error, requestId });
    return mobileError(
      "TEACHER_CATTY_LEARNING_NOT_CREATED",
      "Nao foi possivel enviar este aprendizado agora.",
      503,
      requestId,
    );
  }
}
