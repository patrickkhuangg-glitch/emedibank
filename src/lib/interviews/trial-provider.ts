import 'server-only'
import {createAdminClient} from '@/lib/supabase/admin'
import {ProviderError} from './provider-error'
export async function admitTrialProvider(userId:string,attemptId:string,stage:'transcribe'|'assess'|'audit'|'layout',seconds?:number,fingerprint?:string) {
  const {data,error}=await createAdminClient().rpc('admit_interview_trial_provider',{p_user:userId,p_attempt:attemptId,p_stage:stage,...(seconds?{p_seconds:seconds}:{}),...(fingerprint?{p_fingerprint:fingerprint}:{})})
  if(error)throw new ProviderError('trial_meter_unavailable')
  if(!['full','allowed'].includes(data))throw new ProviderError(`trial_${data??'denied'}`)
}
