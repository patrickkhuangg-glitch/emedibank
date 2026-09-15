import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeInternalPath } from '@/lib/auth/roles'
import { destinationAfterSignIn } from '@/lib/auth/profile-completion'
import { claimSingleDeviceSession } from '@/lib/auth/single-device'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeInternalPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && await claimSingleDeviceSession(supabase)) {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = user ? await supabase.from('profiles').select('role, phone_number').eq('id', user.id).maybeSingle() : { data: null }
      return NextResponse.redirect(`${origin}${destinationAfterSignIn(profile, next)}`)
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
