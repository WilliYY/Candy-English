import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  MobileAdminUserMutationError,
  updateMobileAdminUser,
} from "@/lib/mobile-admin-user-mutations";
import {
  getMobileAdminUser,
  MobileAdminUsersError,
} from "@/lib/mobile-admin-users";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const requestId = getMobileRequestId(request);
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
  if (authorization.user.role !== "ADMIN") {
    return mobileError(
      "ROLE_FORBIDDEN",
      "Use uma conta administrativa para acessar usuarios.",
      403,
      requestId,
    );
  }

  try {
    const { userId } = await context.params;
    const user = await getMobileAdminUser(authorization.user, userId);
    return mobileJson({ ok: true, user }, 200, requestId);
  } catch (error) {
    if (error instanceof MobileAdminUsersError) {
      if (error.code === "USER_NOT_FOUND") {
        return mobileError(
          error.code,
          "Usuario nao encontrado.",
          404,
          requestId,
        );
      }
      return mobileError(
        error.code,
        error.code === "INVALID_QUERY"
          ? "Identificador de usuario invalido."
          : "Voce nao tem acesso a usuarios administrativos.",
        error.code === "INVALID_QUERY" ? 400 : 403,
        requestId,
      );
    }

    console.error("[mobile-admin-user]", { error, requestId });
    return mobileError(
      "ADMIN_USER_UNAVAILABLE",
      "Nao foi possivel carregar este usuario agora.",
      503,
      requestId,
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const requestId = getMobileRequestId(request);
  const token = parseBearerToken(request.headers.get("authorization"));
  const authorization = token ? await authorizeMobileAccess(token) : null;

  if (!authorization?.ok) {
    return mobileError("SESSION_INVALID", "Entre novamente para continuar.", 401, requestId);
  }
  if (authorization.user.role !== "ADMIN") {
    return mobileError("ROLE_FORBIDDEN", "Use uma conta administrativa para editar usuarios.", 403, requestId);
  }

  try {
    const { userId } = await context.params;
    const result = await updateMobileAdminUser(
      authorization.user,
      userId,
      await request.json().catch(() => null),
    );
    return mobileJson({ ok: true, ...result }, 200, requestId);
  } catch (error) {
    if (error instanceof MobileAdminUserMutationError) {
      const status = error.code === "USER_NOT_FOUND" ? 404 : error.code === "ROLE_FORBIDDEN" ? 403 : error.code === "INVALID_INPUT" ? 400 : 409;
      const messages: Partial<Record<MobileAdminUserMutationError["code"], string>> = {
        EDIT_CONFLICT: "Este usuario mudou em outro aparelho. Recarregue antes de salvar.",
        EMAIL_CONFLICT: "Este email ja esta cadastrado.",
        INVALID_INPUT: "Revise os dados do usuario.",
        ROLE_FORBIDDEN: "Voce nao tem permissao para editar usuarios.",
        USER_NOT_FOUND: "Usuario nao encontrado.",
      };
      return mobileError(error.code, messages[error.code] ?? "Nao foi possivel editar o usuario.", status, requestId);
    }
    console.error("[mobile-admin-user:update]", { error, requestId });
    return mobileError("ADMIN_USER_UPDATE_UNAVAILABLE", "Nao foi possivel editar o usuario agora.", 503, requestId);
  }
}
