export const USER_RETENTION_YEARS = 2;
export const ANONYMIZED_USER_NAME = "Conta excluída";

type UserRetentionState = {
  anonymizedAt: Date | null;
  deletedAt: Date | null;
  scheduledAnonymizationAt: Date | null;
};

export function getUserAnonymizationDate(deletedAt: Date) {
  const result = new Date(deletedAt);
  const originalDay = result.getUTCDate();
  const targetYear = result.getUTCFullYear() + USER_RETENTION_YEARS;
  const targetMonth = result.getUTCMonth();
  const lastTargetMonthDay = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();

  result.setUTCDate(1);
  result.setUTCFullYear(targetYear);
  result.setUTCMonth(targetMonth);
  result.setUTCDate(Math.min(originalDay, lastTargetMonthDay));

  return result;
}

export function isUserReadyForAnonymization(
  state: UserRetentionState,
  now = new Date(),
) {
  return Boolean(
    state.deletedAt &&
      state.scheduledAnonymizationAt &&
      !state.anonymizedAt &&
      state.scheduledAnonymizationAt.getTime() <= now.getTime(),
  );
}

export function buildAnonymizedUserEmail(userId: string) {
  const safeId = userId.toLowerCase().replace(/[^a-z0-9_-]/g, "-");

  return `conta-excluida+${safeId}@retencao.invalid`;
}
