import type { Role } from "@/lib/roles";

export type MobileDeviceInput = {
  appVersion?: string;
  installationId: string;
  name?: string;
  platform: "ANDROID" | "IOS" | "WEB";
};

export type MobileAuthUser = {
  email: string;
  id: string;
  name: string;
  role: Role;
};

export type MobileSessionTokens = {
  accessExpiresAt: Date;
  accessToken: string;
  refreshExpiresAt: Date;
  refreshToken: string;
};

export type MobileAuthSuccess = {
  ok: true;
  tokens: MobileSessionTokens;
  user: MobileAuthUser;
};

export type MobileAuthFailure = {
  code:
    | "ACCESS_EXPIRED"
    | "DEVICE_MISMATCH"
    | "INVALID_TOKEN"
    | "REFRESH_EXPIRED"
    | "REFRESH_REPLAYED"
    | "SESSION_CHANGED"
    | "SESSION_REVOKED"
    | "USER_INACTIVE";
  ok: false;
};

export type MobileAuthResult = MobileAuthFailure | MobileAuthSuccess;
