import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from './client'

/** Repeated checkouts share one deadline; a previous subscription uses paid checkout. */
export async function getCheckoutTrialEnd(userId: string, customerId: string): Promise<number | null> {
  // Check Stripe as well as the local ledger so delayed webhooks cannot reissue
  // a trial to a customer whose subscription already exists.
  const history = await getStripe().subscriptions.list({ customer: customerId, status: 'all', limit: 1 })
  if (history.data.length > 0) return null
  const { data, error } = await createAdminClient().rpc('reserve_account_trial', { p_user_id: userId })
  if (error || !data) throw new Error('Trial eligibility could not be checked. Please try again.')
  const trialEnd = Math.floor(new Date(data).getTime() / 1000)
  // Stripe Checkout requires trial_end to be at least 48 hours in the future.
  // Leave a minute for the API call; never extend the reserved deadline.
  return trialEnd > Math.floor(Date.now() / 1000) + 48 * 60 * 60 + 60 ? trialEnd : null
}
