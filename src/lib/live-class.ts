const DEFAULT_JITSI_DOMAIN = "meet.jit.si";

function normalizeDomain(value?: string | null) {
  const rawValue = value?.trim();

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = new URL(
      rawValue.startsWith("http://") || rawValue.startsWith("https://")
        ? rawValue
        : `https://${rawValue}`,
    );
    const hostname = parsed.hostname.toLowerCase();

    if (!/^[a-z0-9.-]+$/.test(hostname)) {
      return null;
    }

    return hostname;
  } catch {
    return null;
  }
}

export function getLiveClassJitsiDomain() {
  return (
    normalizeDomain(process.env.NEXT_PUBLIC_LIVE_CLASS_JITSI_DOMAIN) ??
    DEFAULT_JITSI_DOMAIN
  );
}

export function getLiveClassJitsiDomains() {
  return Array.from(
    new Set([DEFAULT_JITSI_DOMAIN, getLiveClassJitsiDomain()]),
  );
}

export function getLiveClassJitsiOrigin() {
  return `https://${getLiveClassJitsiDomain()}`;
}

export function getLiveClassJitsiOrigins() {
  return getLiveClassJitsiDomains().map((domain) => `https://${domain}`);
}

export function isLiveClassJitsiHost(hostname: string) {
  const normalizedHostname = normalizeDomain(hostname);

  return normalizedHostname
    ? getLiveClassJitsiDomains().includes(normalizedHostname)
    : false;
}
