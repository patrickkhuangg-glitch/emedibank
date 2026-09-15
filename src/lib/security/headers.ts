export function contentSecurityPolicy(nonce: string, development = false) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://challenges.cloudflare.com https://www.googletagmanager.com${development ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://image.mux.com https://*.google-analytics.com",
    "font-src 'self'",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.mux.com https://*.mux.dev https://challenges.cloudflare.com https://*.google-analytics.com https://www.googletagmanager.com${development ? ' ws://localhost:* ws://127.0.0.1:*' : ''}`,
    "media-src 'self' blob: https://*.supabase.co https://stream.mux.com",
    "worker-src 'self' blob:",
    "frame-src https://challenges.cloudflare.com https://player.mux.com",
    "object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'",
    "form-action 'self' https://checkout.stripe.com https://billing.stripe.com https://accounts.google.com https://*.supabase.co",
    ...(!development ? ['upgrade-insecure-requests'] : []),
  ].join('; ')
}
