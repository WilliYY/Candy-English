import type { MobileAuthUser } from "@/lib/mobile-auth/contracts";
import { getMobileAdminPreRegistration } from "@/lib/mobile-admin-pre-registrations";
import { z } from "zod";

const requestIdSchema = z.string().trim().min(1).max(200);
const conversionInputSchema = z
  .object({
    confirmConversion: z.literal(true),
    confirmMissingAgendaData: z.boolean(),
    confirmMissingFinancialData: z.boolean(),
    emailForLogin: z.string().trim().email().max(254),
    expectedUpdatedAt: z.string().datetime(),
    initialPassword: z.string().min(8).max(120),
    operationId: z.string().uuid(),
  })
  .strict();

type Detail = Awaited<ReturnType<typeof getMobileAdminPreRegistration>>;
type CoreConversionInput = {
  confirmConversion: true;
  confirmMissingAgendaData: boolean;
  emailForLogin: string;
  initialPassword: string;
  requestId: string;
};
type CoreConversionResult = {
  message?: string;
  ok: boolean;
};

type Options = {
  executeConversion: (
    input: CoreConversionInput,
    operationId: string,
    expectedUpdatedAt: string,
  ) => Promise<CoreConversionResult>;
  getDetail?: (
    actor: MobileAuthUser,
    requestId: string,
  ) => Promise<Detail>;
};

export class MobileAdminPreRegistrationConversionError extends Error {
  constructor(
    public readonly code:
      | "CONVERSION_CONFLICT"
      | "EDIT_CONFLICT"
      | "INVALID_INPUT"
      | "MISSING_DATA_CONFIRMATION"
      | "PRE_REGISTRATION_UNAVAILABLE"
      | "ROLE_FORBIDDEN",
    message: string = code,
  ) {
    super(message);
    this.name = "MobileAdminPreRegistrationConversionError";
  }
}

export async function convertMobileAdminPreRegistration(
  actor: MobileAuthUser,
  requestId: unknown,
  input: unknown,
  options: Options,
) {
  if (actor.role !== "ADMIN") {
    throw new MobileAdminPreRegistrationConversionError("ROLE_FORBIDDEN");
  }
  const parsedRequestId = requestIdSchema.safeParse(requestId);
  const parsed = conversionInputSchema.safeParse(input);
  if (!parsedRequestId.success || !parsed.success) {
    throw new MobileAdminPreRegistrationConversionError("INVALID_INPUT");
  }

  const getDetail = options.getDetail ?? getMobileAdminPreRegistration;
  const current = await getDetail(actor, parsedRequestId.data);
  const replayCandidate = current.converted;
  if (
    !replayCandidate &&
    current.updatedAt !== parsed.data.expectedUpdatedAt
  ) {
    throw new MobileAdminPreRegistrationConversionError("EDIT_CONFLICT");
  }
  if (!replayCandidate && !current.canConvert) {
    throw new MobileAdminPreRegistrationConversionError(
      "PRE_REGISTRATION_UNAVAILABLE",
    );
  }
  if (
    !replayCandidate &&
    ((!current.agenda.complete && !parsed.data.confirmMissingAgendaData) ||
      (!current.finance.complete && !parsed.data.confirmMissingFinancialData))
  ) {
    throw new MobileAdminPreRegistrationConversionError(
      "MISSING_DATA_CONFIRMATION",
    );
  }

  const result = await options.executeConversion(
    {
      confirmConversion: true,
      confirmMissingAgendaData: parsed.data.confirmMissingAgendaData,
      emailForLogin: parsed.data.emailForLogin,
      initialPassword: parsed.data.initialPassword,
      requestId: parsedRequestId.data,
    },
    parsed.data.operationId,
    parsed.data.expectedUpdatedAt,
  );
  if (!result.ok) {
    throw new MobileAdminPreRegistrationConversionError(
      "CONVERSION_CONFLICT",
      result.message ?? "Nao foi possivel converter este pre-cadastro.",
    );
  }

  return {
    message: result.message ?? "Aluno convertido com sucesso.",
    preRegistration: await getDetail(actor, parsedRequestId.data),
  };
}
