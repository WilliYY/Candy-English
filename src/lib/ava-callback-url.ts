const AVA_CALLBACK_PATHS = new Set([
  "/ava",
  "/ava/admin",
  "/ava/escolha",
  "/ava/secretaria",
  "/ava/student",
  "/ava/teacher",
]);

type AvaSearchParams = Record<string, string | string[] | undefined>;

export function buildAvaCallbackUrl(
  pathname: string,
  searchParams: AvaSearchParams | undefined,
  allowedKeys: readonly string[],
) {
  const callbackSearchParams = new URLSearchParams();

  for (const key of allowedKeys) {
    const rawValue = searchParams?.[key];
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;

    if (value) {
      callbackSearchParams.set(key, value);
    }
  }

  const query = callbackSearchParams.toString();

  return query ? `${pathname}?${query}` : pathname;
}

export function getSafeAvaCallbackUrl(callbackUrl: string | null) {
  if (!callbackUrl) {
    return "/ava";
  }

  try {
    const parsed = new URL(callbackUrl, "https://candy.local");

    if (
      parsed.origin !== "https://candy.local" ||
      !AVA_CALLBACK_PATHS.has(parsed.pathname)
    ) {
      return "/ava";
    }

    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/ava";
  }
}
