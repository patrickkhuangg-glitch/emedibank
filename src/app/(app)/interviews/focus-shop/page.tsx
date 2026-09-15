import type { Metadata } from 'next'
import { FocusTokenShop } from '@/components/interviews/focus-token-shop'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Focus Token shop' }

export default async function FocusTokenShopPage() {
  const user = await requireUser('/interviews/focus-shop')
  const db = await createClient()
  const { data, error } = await db.from('interview_progression_profiles').select('focus_tokens').eq('user_id', user.id).maybeSingle()
  return <FocusTokenShop balance={error ? null : data?.focus_tokens ?? 0} />
}
