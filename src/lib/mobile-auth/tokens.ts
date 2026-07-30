import { createHash, randomBytes } from "node:crypto";

const ACCESS_TOKEN_PATTERN = /^cea_[A-Za-z0-9_-]{43}$/;
const REFRESH_TOKEN_PATTERN = /^cer_[A-Za-z0-9_-]{64}$/;

export type MobileTokenKind = "access" | "refresh";

export type MobileToken = {
  hash: string;
  value: string;
};

export function hashMobileToken(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function createMobileToken(kind: MobileTokenKind): MobileToken {
  const isAccess = kind === "access";
  const prefix = isAccess ? "cea_" : "cer_";
  const entropyBytes = isAccess ? 32 : 48;
  const value = `${prefix}${randomBytes(entropyBytes).toString("base64url")}`;

  return {
    hash: hashMobileToken(value),
    value,
  };
}

export function isAccessToken(value: string) {
  return ACCESS_TOKEN_PATTERN.test(value);
}

export function isRefreshToken(value: string) {
  return REFRESH_TOKEN_PATTERN.test(value);
}

export function parseBearerToken(header: string | null | undefined) {
  if (!header) {
    return null;
  }

  const match = /^Bearer ([^\s,]+)$/i.exec(header);
  const token = match?.[1];

  return token && isAccessToken(token) ? token : null;
}
