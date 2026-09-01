import { createHmac } from "node:crypto";
import { isIP } from "node:net";

const LOGIN_IP_HASH_CONTEXT = "candy-english:login-ip:v1";

function normalizeIpAddress(value: string | null) {
  if (!value) {
    return null;
  }

  let candidate = value.trim();

  if (candidate.startsWith("[") && candidate.includes("]")) {
    candidate = candidate.slice(1, candidate.indexOf("]"));
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) {
    candidate = candidate.slice(0, candidate.lastIndexOf(":"));
  }

  if (candidate.toLowerCase().startsWith("::ffff:")) {
    const mappedIpv4 = candidate.slice(7);

    if (isIP(mappedIpv4) === 4) {
      return mappedIpv4;
    }
  }

  return isIP(candidate) ? candidate.toLowerCase() : null;
}

export function getTrustedProxyClientIp(headers: Headers) {
  const realIp = normalizeIpAddress(headers.get("x-real-ip"));

  if (realIp) {
    return realIp;
  }

  const forwardedFor = headers.get("x-forwarded-for");

  if (!forwardedFor) {
    return null;
  }

  const forwardedAddresses = forwardedFor.split(",");

  for (let index = forwardedAddresses.length - 1; index >= 0; index -= 1) {
    const forwardedIp = normalizeIpAddress(forwardedAddresses[index] ?? null);

    if (forwardedIp) {
      return forwardedIp;
    }
  }

  return null;
}

export function createLoginIpHash(ipAddress: string, secret: string) {
  const normalizedIp = normalizeIpAddress(ipAddress);

  if (!normalizedIp || secret.length < 32) {
    return null;
  }

  return createHmac("sha256", secret)
    .update(`${LOGIN_IP_HASH_CONTEXT}:${normalizedIp}`)
    .digest("hex");
}

export function getLoginIpHash(
  headers: Headers,
  secret = process.env.AUTH_SECRET,
) {
  const clientIp = getTrustedProxyClientIp(headers);

  if (!clientIp || !secret) {
    return null;
  }

  return createLoginIpHash(clientIp, secret);
}
