// Centralised access to Supabase environment variables.
//
// Env var naming (see SETUP-ACCOUNTS.md): Supabase now issues "publishable" and
// "secret" keys, historically called "anon" and "service_role". We keep the
// classic NEXT_PUBLIC_SUPABASE_ANON_KEY name for the browser-safe key so the
// wiring is familiar; it holds whichever public key your dashboard shows.

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Add it to .env.local (see .env.example).`,
    )
  }
  return value
}

export function getSupabaseUrl(): string {
  return required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
}

/** Browser-safe publishable/anon key. */
export function getSupabaseAnonKey(): string {
  return required(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

/** Server-only secret/service_role key. Never import this into client code. */
export function getSupabaseSecretKey(): string {
  return required('SUPABASE_SECRET_KEY', process.env.SUPABASE_SECRET_KEY)
}
