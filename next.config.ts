import type { NextConfig } from "next";
import { getLiveClassJitsiOrigins } from "./src/lib/live-class";

const liveClassJitsiPermissionOrigins = getLiveClassJitsiOrigins()
  .map((origin) => `"${origin}"`)
  .join(" ");

const nextConfig: NextConfig = {
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
            value: "DENY",
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
            key: "Permissions-Policy",
            value:
              `camera=(self ${liveClassJitsiPermissionOrigins}), microphone=(self ${liveClassJitsiPermissionOrigins}), display-capture=(self ${liveClassJitsiPermissionOrigins}), geolocation=()`,
          },
        ],
        source: "/(.*)",
      },
    ];
  },
  output: "standalone",
};

export default nextConfig;
