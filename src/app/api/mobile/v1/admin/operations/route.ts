import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  getMobileAdminOperations,
  MobileAdminOperationsError,
  updateMobileAdminMaintenance,
} from "@/lib/mobile-admin-operations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function operationErrorResponse(
  error: MobileAdminOperationsError,
  requestId: string,
) {
  const messages: Record<MobileAdminOperationsError["code"], string> = {
    EDIT_CONFLICT:
      "O estado de manutencao mudou em outro aparelho. Recarregue antes de continuar.",
    INVALID_INPUT: "Revise e confirme a alteracao de manutencao.",
    OPERATION_CONFLICT: "Esta operacao ja foi usada com outra alteracao.",
    ROLE_FORBIDDEN: "Voce nao tem acesso as opcoes operacionais.",
    WRITE_CONFLICT:
      "A manutencao mudou durante a alteracao. Recarregue e tente novamente.",
  };
  const status =
    error.code === "ROLE_FORBIDDEN"
      ? 403
      : error.code === "INVALID_INPUT"
        ? 400
        : 409;
  return mobileError(
    error.code,
    messages[error.code],
    status,
    requestId,
  );
}

async function authorizeAdmin(request: Request) {
  const token = parseBearerToken(request.headers.get("authorization"));
  return token ? authorizeMobileAccess(token) : null;
}

export async function GET(request: Request) {
  const requestId = getMobileRequestId(request);
  const authorization = await authorizeAdmin(request);
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
      "Use uma conta administrativa para acessar as opcoes operacionais.",
      403,
      requestId,
    );
  }

  try {
    const operations = await getMobileAdminOperations(authorization.user);
    return mobileJson({ ok: true, operations }, 200, requestId);
  } catch (error) {
    if (error instanceof MobileAdminOperationsError) {
      return operationErrorResponse(error, requestId);
    }
    console.error("[mobile-admin-operations:read]", { error, requestId });
    return mobileError(
      "ADMIN_OPERATIONS_UNAVAILABLE",
      "Nao foi possivel carregar o status operacional agora.",
      503,
      requestId,
    );
  }
}

export async function PATCH(request: Request) {
  const requestId = getMobileRequestId(request);
  const authorization = await authorizeAdmin(request);
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
      "Use uma conta administrativa para alterar a manutencao.",
      403,
      requestId,
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const result = await updateMobileAdminMaintenance(
      authorization.user,
      body,
    );
    return mobileJson(
      {
        message: result.replayed
          ? "Alteracao ja confirmada anteriormente."
          : result.changed
            ? "Manutencao atualizada com sucesso."
            : "A manutencao ja estava com esse estado.",
        ok: true,
        result,
      },
      200,
      requestId,
    );
  } catch (error) {
    if (error instanceof MobileAdminOperationsError) {
      return operationErrorResponse(error, requestId);
    }
    console.error("[mobile-admin-operations:update]", { error, requestId });
    return mobileError(
      "ADMIN_MAINTENANCE_UNAVAILABLE",
      "Nao foi possivel alterar a manutencao agora.",
      503,
      requestId,
    );
  }
}
