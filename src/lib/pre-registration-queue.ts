export const OPEN_PRE_REGISTRATION_STATUSES = [
  "PENDING",
  "CONTACTED",
  "WAITING_PAYMENT",
  "READY_TO_CONVERT",
] as const;

export type OpenPreRegistrationStatus =
  (typeof OPEN_PRE_REGISTRATION_STATUSES)[number];

export function isOpenPreRegistrationStatus(
  status: string,
): status is OpenPreRegistrationStatus {
  return OPEN_PRE_REGISTRATION_STATUSES.some(
    (openStatus) => openStatus === status,
  );
}
