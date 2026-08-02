import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import { mobileError } from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { MobileAdminCandyXpError } from "@/lib/mobile-admin-candy-xp";

export function mobileAdminCandyXpErrorResponse(
  error: MobileAdminCandyXpError,
  requestId: string,
) {
  const messages: Record<MobileAdminCandyXpError["code"], string> = {
    EDIT_CONFLICT:
      "A atividade mudou em outro aparelho. Recarregue antes de continuar.",
    INVALID_INPUT: "Revise os dados do Candy XP.",
    INVALID_QUERY: "Revise os filtros do Candy XP.",
    NOT_FOUND: "Atividade Candy XP nao encontrada.",
    OPERATION_CONFLICT: "Esta operacao ja foi usada com outra alteracao.",
    RESULT_LIMIT: "Ha dados demais para uma resposta movel segura.",
    REVIEW_CONFLICT:
      "Esta entrega ja foi corrigida. Recarregue antes de continuar.",
    ROLE_FORBIDDEN: "Voce nao tem acesso ao Candy XP administrativo.",
    STUDENT_NOT_FOUND: "Aluno ativo nao encontrado.",
    WRITE_CONFLICT:
      "O Candy XP mudou durante a alteracao. Recarregue e tente novamente.",
  };
  const status: Record<MobileAdminCandyXpError["code"], number> = {
    EDIT_CONFLICT: 409,
    INVALID_INPUT: 400,
    INVALID_QUERY: 400,
    NOT_FOUND: 404,
    OPERATION_CONFLICT: 409,
    RESULT_LIMIT: 409,
    REVIEW_CONFLICT: 409,
    ROLE_FORBIDDEN: 403,
    STUDENT_NOT_FOUND: 404,
    WRITE_CONFLICT: 409,
  };
  return mobileError(error.code, messages[error.code], status[error.code], requestId);
}

export async function authorizeMobileAdminCandyXp(
  request: Request,
  requestId: string,
) {
  const token = parseBearerToken(request.headers.get("authorization"));
  const authorization = token ? await authorizeMobileAccess(token) : null;
  if (!authorization?.ok) {
    return {
      error: mobileError(
        "SESSION_INVALID",
        "Entre novamente para continuar.",
        401,
        requestId,
      ),
    } as const;
  }
  if (authorization.user.role !== "ADMIN") {
    return {
      error: mobileError(
        "ROLE_FORBIDDEN",
        "Use uma conta administrativa para acessar o Candy XP.",
        403,
        requestId,
      ),
    } as const;
  }
  return { user: authorization.user } as const;
}
