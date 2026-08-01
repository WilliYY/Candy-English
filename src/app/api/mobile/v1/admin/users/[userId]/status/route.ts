import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import { getMobileRequestId, mobileError, mobileJson } from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  changeMobileAdminUserStatus,
  MobileAdminUserMutationError,
} from "@/lib/mobile-admin-user-mutations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ userId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = getMobileRequestId(request);
  const token = parseBearerToken(request.headers.get("authorization"));
  const authorization = token ? await authorizeMobileAccess(token) : null;

  if (!authorization?.ok) {
    return mobileError("SESSION_INVALID", "Entre novamente para continuar.", 401, requestId);
  }
  if (authorization.user.role !== "ADMIN") {
    return mobileError("ROLE_FORBIDDEN", "Use uma conta administrativa para alterar usuarios.", 403, requestId);
  }

  try {
    const { userId } = await context.params;
    const result = await changeMobileAdminUserStatus(
      authorization.user,
      userId,
      await request.json().catch(() => null),
    );
    return mobileJson({ ok: true, ...result }, 200, requestId);
  } catch (error) {
    if (error instanceof MobileAdminUserMutationError) {
      const messages: Partial<Record<MobileAdminUserMutationError["code"], string>> = {
        EDIT_CONFLICT: "Este usuario mudou em outro aparelho. Recarregue antes de continuar.",
        INVALID_INPUT: "Confirme a alteracao de status.",
        LAST_ACTIVE_ADMIN: "Mantenha pelo menos um admin ativo.",
        ROLE_FORBIDDEN: "Voce nao tem permissao para alterar usuarios.",
        SELF_DEACTIVATION: "Voce nao pode desativar seu proprio acesso.",
        USER_NOT_FOUND: "Usuario nao encontrado.",
      };
      const status = error.code === "USER_NOT_FOUND" ? 404 : error.code === "ROLE_FORBIDDEN" ? 403 : error.code === "INVALID_INPUT" ? 400 : 409;
      return mobileError(error.code, messages[error.code] ?? "Nao foi possivel alterar o usuario.", status, requestId);
    }
    console.error("[mobile-admin-user:status]", { error, requestId });
    return mobileError("ADMIN_USER_STATUS_UNAVAILABLE", "Nao foi possivel alterar o usuario agora.", 503, requestId);
  }
}
