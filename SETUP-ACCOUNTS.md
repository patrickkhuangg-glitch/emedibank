# Setup Checklist — Accounts & Keys (Phase 0)

Do these before you start Phase 0 in Claude Code. Phase 0 only needs **GitHub +
Supabase + Vercel**. Stripe and Mux come in later phases — skip them for now.

Tick each box. Where a value is listed, you'll paste it into `.env.local` (Claude
Code will create that file and an `.env.example` for you).

---

## 1. GitHub  ·  free
Claude Code commits here, and Vercel deploys from it.

- [ ] Create an account at github.com (skip if you have one).
- [ ] Create a new **empty private repo** (e.g. `exam-prep-platform`). No README/gitignore.
- [ ] Note the repo URL — Claude Code will push to it.

---

## 2. Supabase  ·  free tier fine to start
Your database, auth, and file storage.

- [ ] Create an account at supabase.com.
- [ ] Create a new **project**. Pick a region close to your users (Sydney/Australia).
- [ ] **Save the database password** shown at creation somewhere safe — it's not shown
      again. (Resettable later under *Project Settings → Database*.)
- [ ] Wait for the project to finish provisioning (~2 min).

**Grab these values** (in the dashboard: *Project Settings → API Keys*, and
*Project Settings → Data API* for the URL):

| What | Where | Goes in env var |
|---|---|---|
| Project URL | Settings → Data API (`https://xxxx.supabase.co`) | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable key (`sb_publishable_…`) | Settings → API Keys | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Secret key (`sb_secret_…`) | Settings → API Keys → reveal | `SUPABASE_SECRET_KEY` |

> **Key naming note:** Supabase now issues **publishable** and **secret** keys. Older
> projects/tutorials call these **anon** (= publishable, safe for the browser) and
> **service_role** (= secret, server-only, never in client code). If your dashboard
> still shows anon/service_role, those work too — just use anon where the table says
> publishable and service_role where it says secret. Tell Claude Code which naming you
> see so it wires the client correctly.
>
> ⚠️ The **secret / service_role** key bypasses all security rules. Never expose it in
> the browser or commit it. Server-side only.

---

## 3. Vercel  ·  free (Hobby) tier fine to start
Hosting + automatic deploys.

- [ ] Create an account at vercel.com — **sign up with GitHub** so they're linked.
- [ ] You'll **import the repo** here once Claude Code has pushed the first commit
      (Claude Code will tell you when). Don't import an empty repo yet.
- [ ] When you import, add the same three Supabase env vars above under the project's
      **Environment Variables** settings, so the deployed app can reach the database.

---

## 4. Your `.env.local` (Claude Code fills the values)
After the above, you'll have everything for Phase 0:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

- [ ] Paste these into `.env.local` in the project root when Claude Code creates the file.
- [ ] Confirm `.env.local` is git-ignored (Claude Code sets this up — don't commit it).

---

## Later phases — create only when you reach them
- **Stripe** (Phase 1, payments): account → API keys (publishable + secret) → webhook secret.
- **Mux** (Phase 5+, video/interview recording): account → API token (id + secret).
- **Resend / Postmark** (Phase 4, email): account → API key + verified sending domain.

---

### Quick order of operations
1. GitHub repo created.  2. Supabase project created + 3 values saved.
3. Start Phase 0 in Claude Code — it scaffolds and asks for the values.
4. Paste values into `.env.local`; confirm the app runs locally.
5. Claude Code pushes to GitHub → import into Vercel + add the same env vars → live URL.
