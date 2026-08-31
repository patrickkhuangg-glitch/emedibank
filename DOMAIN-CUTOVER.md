# Domain cutover — → studocyte.com

Moving the product from **emedibank.emeducate.com.au** to **studocyte.com**.

The app is domain-agnostic: every functional absolute URL (auth email links, OAuth
callback, Stripe success/cancel/return, Mux CORS) is built from `getOrigin()`, which
reads `NEXT_PUBLIC_SITE_URL` and otherwise falls back to the request host. Metadata,
`robots.txt` and `sitemap.xml` read `SITE_URL` (same env var). So the cutover is
almost entirely dashboard config — do the steps below in order.

Vercel project: `emedibank-x1uw` (team `em-educate`). DNS: Cloudflare. Supabase ref:
`ghxwyfiemvyhijpmrhgf`.

## 1. Register the domain
- [ ] Register **studocyte.com**.

## 2. DNS (Cloudflare)
- [ ] Add **studocyte.com** as a zone in Cloudflare (point the registrar's nameservers
      at Cloudflare), OR manage DNS at the registrar.
- [ ] Add the records **exactly as Vercel shows them** in step 3 — typically:
  - apex `studocyte.com` → CNAME `cname.vercel-dns.com` (Cloudflare flattens the apex),
  - `www` → CNAME `cname.vercel-dns.com`.
- [ ] Set these records to **DNS only (grey cloud)**, matching the existing
      `emedibank` record — Vercel must terminate TLS, not Cloudflare's proxy.

## 3. Vercel
- [ ] Project `emedibank-x1uw` → **Settings → Domains → Add** `studocyte.com` and
      `www.studocyte.com`. Follow the records Vercel prints (use its exact target).
- [ ] Make `studocyte.com` the **Primary** domain; set `www` to redirect to apex.
- [ ] (Optional) Keep `emedibank.emeducate.com.au` attached and set it to **redirect
      to studocyte.com**, or leave it live during transition.
- [ ] Wait for Vercel to issue the TLS certificate (green check).

## 4. Environment variable
- [ ] Vercel → **Settings → Environment Variables**: set
      `NEXT_PUBLIC_SITE_URL = https://studocyte.com` for **Production**
      (and Preview, if you want previews to build absolute URLs correctly).
- [ ] **Redeploy** so the new value is baked in.

## 5. Supabase Auth (URL configuration)
Authentication → **URL Configuration**:
- [ ] **Site URL** → `https://studocyte.com`
- [ ] **Redirect URLs** — add (keep the existing ones too):
  - `https://studocyte.com/auth/callback`
  - `https://studocyte.com/auth/confirm`
  - `https://studocyte.com/**` (covers preview/return paths)
  - keep `http://localhost:3000/**` for local dev.

## 6. Google sign-in (if enabled)
The OAuth **redirect URI stays Supabase's** (`https://ghxwyfiemvyhijpmrhgf.supabase.co/auth/v1/callback`) — no change there.
- [ ] Google Cloud → OAuth consent screen → **Authorized domains**: add `studocyte.com`.
- [ ] Credentials → OAuth client → **Authorized JavaScript origins**: add
      `https://studocyte.com` (only needed if you also do client-side Google flows).

## 7. Webhooks (point at the new host, or keep the stable *.vercel.app URL)
- [ ] **Stripe** → Developers → Webhooks: endpoint URL →
      `https://studocyte.com/api/stripe/webhook` (re-copy the signing secret into
      `STRIPE_WEBHOOK_SECRET` if the endpoint is recreated). Checkout success/cancel
      URLs are dynamic — no change.
- [ ] **Mux** → webhook endpoint → `https://studocyte.com/api/mux/webhook`
      (CORS origin is dynamic via `getOrigin()` — no change).

## 8. University web filters (repeat for the new domain)
studocyte.com is newly registered, so campus filters (UQ etc.) may block it just like
emeducate.com.au was. Re-submit **studocyte.com** for categorization to the major
filter vendors so students on university networks aren't blocked at launch.

## 9. Verify after cutover
- [ ] `https://studocyte.com` loads (green padlock).
- [ ] `https://studocyte.com/robots.txt` and `/sitemap.xml` show studocyte.com URLs.
- [ ] Sign up → confirmation email link lands on `studocyte.com/auth/confirm`.
- [ ] Google sign-in round-trips to `studocyte.com/dashboard`.
- [ ] Stripe checkout → returns to `studocyte.com/account?checkout=success`.
- [ ] Admin video upload (Mux) still works.

## Notes
- "Part of EMeducate" links in the header/footer still point at `emeducate.com.au`
  (the parent brand) — intentional, unchanged.
- No code change is required for the URLs to switch; it all follows
  `NEXT_PUBLIC_SITE_URL` (step 4).
