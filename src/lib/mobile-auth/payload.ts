import type { MobileAuthSuccess } from "@/lib/mobile-auth/contracts";

export function serializeMobileAuthSuccess(result: MobileAuthSuccess) {
  return {
    ok: true as const,
    tokens: {
      accessExpiresAt: result.tokens.accessExpiresAt.toISOString(),
      accessToken: result.tokens.accessToken,
      refreshExpiresAt: result.tokens.refreshExpiresAt.toISOString(),
      refreshToken: result.tokens.refreshToken,
      tokenType: "Bearer" as const,
    },
    user: result.user,
  };
}
