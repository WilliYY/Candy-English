import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  getMobileAdminContract,
  MobileAdminContractsError,
} from "@/lib/mobile-admin-contracts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ contractId: string }> };

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
      "Use uma conta administrativa para acessar os contratos.",
      403,
      requestId,
    );
  }

  try {
    const { contractId } = await context.params;
    const contract = await getMobileAdminContract(
      authorization.user,
      contractId,
    );
    return mobileJson({ contract, ok: true }, 200, requestId);
  } catch (error) {
    if (error instanceof MobileAdminContractsError) {
      return mobileError(
        error.code,
        error.code === "NOT_FOUND"
          ? "Contrato nao encontrado."
          : "Voce nao tem acesso aos contratos administrativos.",
        error.code === "NOT_FOUND" ? 404 : 403,
        requestId,
      );
    }
    console.error("[mobile-admin-contract]", { error, requestId });
    return mobileError(
      "ADMIN_CONTRACT_UNAVAILABLE",
      "Nao foi possivel carregar o contrato agora.",
      503,
      requestId,
    );
  }
}
