import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  createMobileAdminAgendaMakeup,
  MobileAdminAgendaOperationsError,
} from "@/lib/mobile-admin-agenda-operations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ lessonId: string }> };

function operationErrorResponse(
  error: MobileAdminAgendaOperationsError,
  requestId: string,
) {
  const messages: Partial<
    Record<MobileAdminAgendaOperationsError["code"], string>
  > = {
    EDIT_CONFLICT:
      "Esta aula mudou em outro aparelho. Recarregue antes de continuar.",
    INVALID_INPUT: "Revise data, horario e observacao da reposicao.",
    LESSON_NOT_FOUND: "Aula original nao encontrada.",
    MAKEUP_EXISTS: "Esta aula ja possui uma reposicao ativa.",
    MAKEUP_SOURCE_INVALID: "Escolha uma aula original para criar reposicao.",
    OPERATION_REUSED: "Esta operacao ja foi usada em outra aula.",
    ROLE_FORBIDDEN: "Voce nao tem permissao para criar reposicao.",
    WRITE_CONFLICT:
      "A aula mudou durante a alteracao. Recarregue e tente novamente.",
  };
  const status =
    error.code === "ROLE_FORBIDDEN"
      ? 403
      : error.code === "LESSON_NOT_FOUND"
        ? 404
        : error.code === "INVALID_INPUT"
          ? 400
          : 409;
  return mobileError(
    error.code,
    messages[error.code] ?? "Nao foi possivel criar esta reposicao.",
    status,
    requestId,
  );
}

export async function POST(request: Request, context: RouteContext) {
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
      "Use uma conta administrativa para criar reposicao.",
      403,
      requestId,
    );
  }

  try {
    const { lessonId } = await context.params;
    const body = await request.json().catch(() => null);
    const result = await createMobileAdminAgendaMakeup(
      authorization.user,
      lessonId,
      body,
    );
    return mobileJson({ ok: true, result }, 201, requestId);
  } catch (error) {
    if (error instanceof MobileAdminAgendaOperationsError) {
      return operationErrorResponse(error, requestId);
    }
    console.error("[mobile-admin-agenda:makeup]", { error, requestId });
    return mobileError(
      "ADMIN_AGENDA_MAKEUP_UNAVAILABLE",
      "Nao foi possivel criar a reposicao agora.",
      503,
      requestId,
    );
  }
}
