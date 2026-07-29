export const INCOMPLETE_FINANCIAL_PAYMENT_METHOD = "A_DEFINIR";
export const INCOMPLETE_FINANCIAL_PAYMENT_DAY = 1;

type FinancialRegistrationData = {
  amountCents?: number | null;
  paymentDay?: number | null;
  paymentMethod?: string | null;
};

export function hasCompleteFinancialRegistration(
  data: FinancialRegistrationData,
) {
  const paymentMethod = data.paymentMethod?.trim().toUpperCase();

  return Boolean(
    data.amountCents &&
      data.amountCents > 0 &&
      data.paymentDay &&
      data.paymentDay >= 1 &&
      data.paymentDay <= 31 &&
      paymentMethod &&
      paymentMethod !== INCOMPLETE_FINANCIAL_PAYMENT_METHOD,
  );
}

export function resolveFinancialRegistration(
  data: FinancialRegistrationData,
) {
  const isComplete = hasCompleteFinancialRegistration(data);
  const amountCents =
    data.amountCents && data.amountCents > 0 ? data.amountCents : 0;
  const paymentDay =
    data.paymentDay && data.paymentDay >= 1 && data.paymentDay <= 31
      ? data.paymentDay
      : INCOMPLETE_FINANCIAL_PAYMENT_DAY;
  const paymentMethod = isComplete
    ? data.paymentMethod!.trim()
    : INCOMPLETE_FINANCIAL_PAYMENT_METHOD;

  return {
    amountCents,
    isComplete,
    paymentDay,
    paymentMethod,
  };
}
