const emailTypes = ['signup', 'invite', 'recovery', 'magiclink', 'email_change', 'email'] as const
export type AccountEmailType = typeof emailTypes[number]
export type AccountEmailLink = { tokenHash: string; type: AccountEmailType; code: string; next: string }

// Only destinations used by account emails are accepted, including legacy links.
const destinations = new Set(['/dashboard', '/admin', '/bookings', '/account', '/update-password', '/pricing?signup=success'])
export function readAccountEmailLink(params: URLSearchParams): AccountEmailLink | null {
  const next = params.get('next') ?? ''
  const code = params.get('code') ?? ''
  const tokenHash = params.get('token_hash') ?? ''
  const type = params.get('type') ?? ''
  const validToken = /^[a-zA-Z0-9_-]{20,256}$/
  if (code && !tokenHash && validToken.test(code)) {
    return { code, tokenHash: '', type: 'email', next: destinations.has(next) ? next : '' }
  }
  if (code || !validToken.test(tokenHash) || !emailTypes.includes(type as AccountEmailType)) return null
  return { code: '', tokenHash, type: type as AccountEmailType, next: destinations.has(next) ? next : '' }
}

export function accountEmailDestination(link: AccountEmailLink, role: string | null): string {
  if (link.type === 'invite' || link.type === 'recovery') return '/update-password'
  if (link.type === 'email_change') return '/account'
  return link.next || (role === 'admin' ? '/admin' : role === 'tutor' ? '/bookings' : '/dashboard')
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)

export type AccountEmailFailure = 'expired' | 'request' | 'unavailable'

export function accountEmailPage(link: AccountEmailLink | null, failure?: AccountEmailFailure): string {
  const password = link?.type === 'invite' || link?.type === 'recovery' || link?.next === '/update-password'
  const title = !link ? 'Let’s get you back in' : password ? 'Set up your password' : 'You’re one step away'
  const description = !link
    ? failure === 'expired' ? 'This link has expired or has already been used. Request a new password email, then open the most recent message.'
      : failure === 'request' ? 'We couldn’t securely confirm this request. Reopen the email link in your browser and try again.'
      : failure === 'unavailable' ? 'We couldn’t reach the sign-in service. Please reopen the email link and try again shortly.'
      : 'This account link is incomplete. Request a new password email, or sign in if you already have a password.'
    : password ? 'Continue to choose a password for your Studocyte account.' : 'Continue to securely sign in to your Studocyte account.'
  const fields = link ? Object.entries({ token_hash: link.tokenHash, code: link.code, type: link.type, next: link.next }).map(([name, value]) => `<input type="hidden" name="${name}" value="${escapeHtml(value)}">`).join('') : ''
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} · Studocyte</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5f3fa;color:#211b35;font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:100%;max-width:480px;background:white;border:1px solid #e6e0f0;border-radius:24px;padding:40px;box-shadow:0 12px 40px #211b3508}.brand{font-size:30px;font-weight:800;letter-spacing:-1px;line-height:1.2}.brand span{color:#7043ce}.byline{color:#686078;font-size:12px;margin:6px 0 32px}h1{font-size:27px;line-height:1.25;letter-spacing:-.6px}p{color:#686078}button,.button{display:block;width:100%;border:0;border-radius:12px;background:#7043ce;color:white;padding:15px 20px;font-family:inherit;font-size:16px;font-weight:600;text-align:center;text-decoration:none;cursor:pointer}button:hover,.button:hover{background:#5e35b5}button:focus-visible,a:focus-visible{outline:3px solid #b5a0e6;outline-offset:4px}.footer{font-size:13px;margin:24px 0 0}a{color:#7043ce}.secondary{display:block;text-align:center;margin-top:18px;font-size:14px}@media(max-width:480px){.card{padding:28px 24px}}
</style></head><body><main class="card"><div class="brand">Studo<span>cyte</span></div><div class="byline">Part of EMeducate</div><h1>${title}</h1><p>${description}</p>${link ? `<form action="/auth/confirm" method="post">${fields}<button type="submit">${password ? 'Continue to set password' : 'Continue to Studocyte'}</button></form><p class="footer">Only continue if you requested this email or were expecting an invitation. Opening this page alone does not use your link.</p>` : '<a class="button" href="/reset-password">Request a fresh link</a>'}<a class="secondary" href="/login">Back to sign in</a><p class="footer">Need a hand? <a href="mailto:support@emeducate.com.au">Contact EMeducate</a></p></main></body></html>`
}

export const accountEmailHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  // no-referrer makes browsers send Origin: null on native form POSTs, which
  // correctly fail our origin check. strict-origin keeps Origin usable while
  // never including the path/query (and therefore the email token) in Referer.
  'Referrer-Policy': 'strict-origin',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
}
