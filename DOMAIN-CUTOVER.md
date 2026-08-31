# Domain cutover — → studocyte.emeducate.com.au

Moving the product from **emedibank.emeducate.com.au** to
**studocyte.emeducate.com.au** — a new subdomain on the existing `emeducate.com.au`
zone (already in Cloudflare). No new domain to register; this mirrors the current
`emedibank` record, so it's a small, fast change.

The app is domain-agnostic: every functional absolute URL (auth email links, OAuth
callback, Stripe success/cancel/return, Mux CORS) is built from `getOrigin()`, which
reads `NEXT_PUBLIC_SITE_URL` and otherwise falls back to the request host. Metadata,
`robots.txt` and `sitemap.xml` read `SITE_URL` (same env var). So the cutover is
dashboard config — do the steps below in order.

Vercel project: `emedibank-x1uw` (team `em-educate`). DNS: Cloudflare. Supabase ref:
`ghxwyfiemvyhijpmrhgf`.

## 1. DNS (Cloudflare, `emeducate.com.au` zone)
- [ ] Add a CNAME record, mirroring the existing `emedibank` one:
  - **Name:** `studocyte`
  - **Target:** `cname.vercel-dns.com` (use the exact target Vercel shows in step 2 —
    it may be a per-project host like `<hash>.vercel-dns-017.com`)
  - **Proxy status:** **DNS only (grey cloud)** — Vercel must terminate TLS.

## 2. Vercel
- [ ] Project `emedibank-x1uw` → **Settings → Domains → Add**
      `studocyte.emeducate.com.au`. Follow the record Vercel prints (confirm it
      matches step 1).
- [ ] Set `studocyte.emeducate.com.au` as the **Primary** domain.
- [ ] (Optional) Keep `emedibank.emeducate.com.au` attached and set it to **redirect
      to** the new subdomain, or leave both live during transition.
- [ ] Wait for Vercel to issue the TLS certificate (green check).

## 3. Environment variable
- [ ] Vercel → **Settings → Environment Variables**: set
      `NEXT_PUBLIC_SITE_URL = https://studocyte.emeducate.com.au` for **Production**
      (and Preview, if you want previews to build absolute URLs correctly).
- [ ] **Redeploy** so the value is baked in.

## 4. Supabase Auth (URL configuration)
Authentication → **URL Configuration**:
- [ ] **Site URL** → `https://studocyte.emeducate.com.au`
- [ ] **Redirect URLs** — add (keep existing):
  - `https://studocyte.emeducate.com.au/auth/callback`
  - `https://studocyte.emeducate.com.au/auth/confirm`
  - `https://studocyte.emeducate.com.au/**`
  - keep `http://localhost:3000/**` for local dev.

## 5. Google sign-in (if enabled)
The OAuth **redirect URI stays Supabase's**
(`https://ghxwyfiemvyhijpmrhgf.supabase.co/auth/v1/callback`) — no change.
- [ ] Google Cloud → OAuth consent screen → **Authorized domains**: `emeducate.com.au`
      is likely already listed (it covers subdomains). If not, add it.

## 6. Webhooks (point at the new host, or keep the stable *.vercel.app URL)
- [ ] **Stripe** → Webhooks: endpoint →
      `https://studocyte.emeducate.com.au/api/stripe/webhook` (re-copy the signing
      secret into `STRIPE_WEBHOOK_SECRET` if the endpoint is recreated).
- [ ] **Mux** → webhook endpoint →
      `https://studocyte.emeducate.com.au/api/mux/webhook` (CORS is dynamic — no change).

## 7. Campus web filters — note
This subdomain lives under **emeducate.com.au**, so it inherits that domain's filter
status. If a university (e.g. UQ) blocks `emeducate.com.au` broadly, the subdomain is
likely blocked too; if you get `emeducate.com.au` categorised/allow-listed, the
subdomain benefits automatically. The **trademark** reason for the rename (emedibank ≈
Medibank) is fully resolved either way. If campus access matters, chase the
`emeducate.com.au` categorisation with the major filter vendors.

## 8. Verify after cutover
- [ ] `https://studocyte.emeducate.com.au` loads (green padlock).
- [ ] `/robots.txt` and `/sitemap.xml` show `studocyte.emeducate.com.au` URLs.
- [ ] Sign up → confirmation email lands on `…/auth/confirm`.
- [ ] Google sign-in round-trips to `…/dashboard`.
- [ ] Stripe checkout → returns to `…/account?checkout=success`.
- [ ] Admin video upload (Mux) still works.

## Notes
- "Part of EMeducate" links in the header/footer point at `emeducate.com.au` (the
  parent) — intentional, unchanged.
- No code change is required for the URLs to switch; it all follows
  `NEXT_PUBLIC_SITE_URL` (step 3).
