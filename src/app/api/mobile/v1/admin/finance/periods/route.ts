import { revalidatePath } from "next/cache";
import { authorizeMobileAccess } from "@/lib/mobile-auth/access-session";
import { getMobileRequestId, mobileError, mobileJson } from "@/lib/mobile-auth/api-response";
import { parseBearerToken } from "@/lib/mobile-auth/tokens";
import { FinancialPeriodError, listFinancialPeriodCandidates, openFinancialPeriod } from "@/lib/financial-period-operations";
import { financialPeriodCandidatesSchema, openFinancialPeriodSchema } from "@/lib/validations/financial-period";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function authorize(request: Request) {
  const requestId = getMobileRequestId(request);
  const token = parseBearerToken(request.headers.get("authorization"));
  const authorization = token ? await authorizeMobileAccess(token) : null;
  if (!authorization?.ok) return { response: mobileError("SESSION_INVALID", "Entre novamente para continuar.", 401, requestId), requestId };
  if (authorization.user.role !== "ADMIN") return { response: mobileError("ROLE_FORBIDDEN", "Use uma conta administrativa para acessar o financeiro.", 403, requestId), requestId };
  return { userId: authorization.user.id, requestId };
}

function operationError(error: unknown, requestId: string) {
  return error instanceof FinancialPeriodError
    ? mobileError("FINANCE_PERIOD_CONFLICT", error.message, 409, requestId)
    : mobileError("ADMIN_FINANCE_PERIOD_UNAVAILABLE", "Nao foi possivel consultar ou abrir a competencia agora.", 503, requestId);
}

export async function GET(request: Request) {
  const access = await authorize(request);
  if (access.response) return access.response;
  const parsed = financialPeriodCandidatesSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return mobileError("INVALID_QUERY", "Revise competencia, unidade e limite da consulta.", 400, access.requestId);
  try {
    return mobileJson({ ok: true, ...await listFinancialPeriodCandidates(access.userId!, parsed.data) }, 200, access.requestId);
  } catch (error) { return operationError(error, access.requestId); }
}

export async function POST(request: Request) {
  const access = await authorize(request);
  if (access.response) return access.response;
  const parsed = openFinancialPeriodSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return mobileError("INVALID_INPUT", "Confirme aluno e competencia validos.", 400, access.requestId);
  try {
    const result = await openFinancialPeriod(access.userId!, parsed.data);
    revalidatePath("/ava/admin"); revalidatePath("/ava/teacher"); revalidatePath("/ava/vendas");
    return mobileJson({ ok: true, ...result, message: result.created ? "Mensalidade criada na competencia selecionada." : "Esta mensalidade ja existe. Nenhum registro foi duplicado." }, result.created ? 201 : 200, access.requestId);
  } catch (error) { return operationError(error, access.requestId); }
}
