import type { NextConfig } from "next";
import { getLiveClassJitsiOrigins } from "./src/lib/live-class";

const liveClassJitsiPermissionOrigins = getLiveClassJitsiOrigins()
  .map((origin) => `"${origin}"`)
  .join(" ");

const liveClassJitsiCspOrigins = getLiveClassJitsiOrigins().join(" ");
const liveClassJitsiWebSocketOrigins = getLiveClassJitsiOrigins()
  .map((origin) => origin.replace(/^https:/, "wss:"))
  .join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline' ${liveClassJitsiCspOrigins}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${liveClassJitsiCspOrigins} ${liveClassJitsiWebSocketOrigins}`,
  `frame-src 'self' ${liveClassJitsiCspOrigins}`,
  "media-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/ava/ponto/relatorio": ["./node_modules/pdfkit/js/data/**/*"],
  },
  serverExternalPackages: ["pdfkit"],
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  async headers() {
    return [
      {
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
          {
            key: "Permissions-Policy",
            value:
              `camera=(self ${liveClassJitsiPermissionOrigins}), microphone=(self ${liveClassJitsiPermissionOrigins}), display-capture=(self ${liveClassJitsiPermissionOrigins}), geolocation=()`,
          },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "off",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
        ],
        source: "/(.*)",
      },
    ];
  },
  output: "standalone",
};

export default nextConfig;
