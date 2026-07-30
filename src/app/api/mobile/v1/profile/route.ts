import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  getMobileStudentProfile,
  persistOwnProfile,
} from "@/lib/profile-service";
import { updateProfileSchema } from "@/lib/validations/ava-operations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const mobileProfileUpdateSchema = updateProfileSchema.strict();

async function authenticateStudent(request: Request) {
  const token = parseBearerToken(request.headers.get("authorization"));
  const session = token ? await authorizeMobileAccess(token) : null;

  return session?.ok ? session : null;
}

export async function GET(request: Request) {
  const requestId = getMobileRequestId(request);
  const session = await authenticateStudent(request);

  if (!session) {
    return mobileError(
      "SESSION_INVALID",
      "Entre novamente para continuar.",
      401,
      requestId,
    );
  }

  if (session.user.role !== "STUDENT") {
    return mobileError(
      "ROLE_FORBIDDEN",
      "Use uma conta de aluno para acessar este perfil.",
      403,
      requestId,
    );
  }

  try {
    const profile = await getMobileStudentProfile(session.user.id);

    if (!profile) {
      return mobileError(
        "PROFILE_NOT_FOUND",
        "Perfil nao encontrado.",
        404,
        requestId,
      );
    }

    return mobileJson({ ok: true, profile }, 200, requestId);
  } catch (error) {
    console.error("[mobile-profile:get]", { error, requestId });
    return mobileError(
      "PROFILE_UNAVAILABLE",
      "Nao foi possivel carregar seu perfil agora.",
      503,
      requestId,
    );
  }
}

export async function PATCH(request: Request) {
  const requestId = getMobileRequestId(request);
  const session = await authenticateStudent(request);

  if (!session) {
    return mobileError(
      "SESSION_INVALID",
      "Entre novamente para continuar.",
      401,
      requestId,
    );
  }

  if (session.user.role !== "STUDENT") {
    return mobileError(
      "ROLE_FORBIDDEN",
      "Use uma conta de aluno para atualizar este perfil.",
      403,
      requestId,
    );
  }

  const parsed = mobileProfileUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return mobileError(
      "INVALID_REQUEST",
      parsed.error.issues[0]?.message ?? "Revise os dados do perfil.",
      400,
      requestId,
    );
  }

  try {
    await persistOwnProfile(
      { role: session.user.role, userId: session.user.id },
      parsed.data,
    );
    const profile = await getMobileStudentProfile(session.user.id);

    if (!profile) {
      return mobileError(
        "PROFILE_NOT_FOUND",
        "Perfil nao encontrado.",
        404,
        requestId,
      );
    }

    return mobileJson(
      {
        message: "Perfil atualizado com sucesso.",
        ok: true,
        profile,
      },
      200,
      requestId,
    );
  } catch (error) {
    console.error("[mobile-profile:update]", { error, requestId });
    return mobileError(
      "PROFILE_NOT_UPDATED",
      "Nao foi possivel atualizar seu perfil agora.",
      503,
      requestId,
    );
  }
}
