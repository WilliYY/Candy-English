export type MobileSessionPolicyInput = {
  accessExpiresAt: Date;
  deviceInstallationId: string;
  expectedInstallationId: string;
  refreshConsumedAt: Date | null;
  refreshExpiresAt: Date;
  revokedAt: Date | null;
  sessionVersion: number;
  userIsActive: boolean;
  userSessionVersion: number;
};

export type AccessSessionProblem =
  | "ACCESS_EXPIRED"
  | "SESSION_CHANGED"
  | "SESSION_REVOKED"
  | "USER_INACTIVE";

export type RefreshSessionProblem =
  | "DEVICE_MISMATCH"
  | "REFRESH_EXPIRED"
  | "REFRESH_REPLAYED"
  | "SESSION_CHANGED"
  | "SESSION_REVOKED"
  | "USER_INACTIVE";

function getSharedSessionProblem(
  input: MobileSessionPolicyInput,
): "SESSION_CHANGED" | "SESSION_REVOKED" | "USER_INACTIVE" | null {
  if (input.revokedAt) {
    return "SESSION_REVOKED";
  }

  if (!input.userIsActive) {
    return "USER_INACTIVE";
  }

  if (input.sessionVersion !== input.userSessionVersion) {
    return "SESSION_CHANGED";
  }

  return null;
}

export function getAccessSessionProblem(
  input: MobileSessionPolicyInput,
  now = new Date(),
): AccessSessionProblem | null {
  const sharedProblem = getSharedSessionProblem(input);

  if (sharedProblem) {
    return sharedProblem;
  }

  return input.accessExpiresAt.getTime() <= now.getTime()
    ? "ACCESS_EXPIRED"
    : null;
}

export function getRefreshSessionProblem(
  input: MobileSessionPolicyInput,
  now = new Date(),
): RefreshSessionProblem | null {
  if (input.refreshConsumedAt) {
    return "REFRESH_REPLAYED";
  }

  const sharedProblem = getSharedSessionProblem(input);

  if (sharedProblem) {
    return sharedProblem;
  }

  if (input.deviceInstallationId !== input.expectedInstallationId) {
    return "DEVICE_MISMATCH";
  }

  return input.refreshExpiresAt.getTime() <= now.getTime()
    ? "REFRESH_EXPIRED"
    : null;
}
