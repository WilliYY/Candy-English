import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import {
  getMobileRequestId,
  mobileError,
  mobileJson,
} from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import {
  getMobileAdminAgendaLesson,
  MobileAdminAgendaOperationsError,
  updateMobileAdminAgendaAttendance,
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
    INVALID_INPUT: "Revise os dados da aula.",
    LESSON_NOT_FOUND: "Aula da agenda nao encontrada.",
    OPERATION_REUSED: "Esta operacao ja foi usada em outra aula.",
    ROLE_FORBIDDEN: "Voce nao tem permissao para alterar a agenda.",
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
    messages[error.code] ?? "Nao foi possivel alterar esta aula.",
    status,
    requestId,
  );
}

async function authorizeAdmin(request: Request) {
  const token = parseBearerToken(request.headers.get("authorization"));
  return token ? authorizeMobileAccess(token) : null;
}

export async function GET(request: Request, context: RouteContext) {
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
      "Use uma conta administrativa para acessar a agenda.",
      403,
      requestId,
    );
  }

  try {
    const { lessonId } = await context.params;
    const detail = await getMobileAdminAgendaLesson(
      authorization.user,
      lessonId,
    );
    return mobileJson({ detail, ok: true }, 200, requestId);
  } catch (error) {
    if (error instanceof MobileAdminAgendaOperationsError) {
      return operationErrorResponse(error, requestId);
    }
    console.error("[mobile-admin-agenda:lesson]", { error, requestId });
    return mobileError(
      "ADMIN_AGENDA_LESSON_UNAVAILABLE",
      "Nao foi possivel carregar esta aula agora.",
      503,
      requestId,
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
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
      "Use uma conta administrativa para alterar a agenda.",
      403,
      requestId,
    );
  }

  try {
    const { lessonId } = await context.params;
    const body = await request.json().catch(() => null);
    const result = await updateMobileAdminAgendaAttendance(
      authorization.user,
      lessonId,
      body,
    );
    return mobileJson({ ok: true, result }, 200, requestId);
  } catch (error) {
    if (error instanceof MobileAdminAgendaOperationsError) {
      return operationErrorResponse(error, requestId);
    }
    console.error("[mobile-admin-agenda:attendance]", { error, requestId });
    return mobileError(
      "ADMIN_AGENDA_ATTENDANCE_UNAVAILABLE",
      "Nao foi possivel atualizar a presenca agora.",
      503,
      requestId,
    );
  }
}
