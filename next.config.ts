import type { NextConfig } from "next";

// Baseline security headers applied to every response. (HSTS is already added by
// the platform.) CSP is intentionally left out for now — it needs tuning against
// Mux/Supabase and inline styles, tracked in LAUNCH-CHECKLIST.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Interview practice records audio after an explicit student action. Keep the
  // camera and location locked down while allowing this origin to request a mic.
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
