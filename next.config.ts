import type { NextConfig } from "next";

// CSP is generated per request in proxy.ts; never cache/reuse its nonce.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Interview practice requests camera and microphone only after an explicit action.
  // Allow this origin; retain the location restriction.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['@ffprobe-installer/ffprobe'],
  outputFileTracingIncludes: {
    '/api/internal/interviews/*': ['./node_modules/@ffprobe-installer/*/ffprobe', './node_modules/@ffprobe-installer/*/package.json'],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
