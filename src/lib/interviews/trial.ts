import 'server-only'
import { createHmac } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { InterviewApiError } from './api'
import { trialQuestionAllowed } from './trial-catalog'
export type InterviewAccess = { kind:'full'|'eligible'|'active'|'expired'|'unavailable'; expiresAt?:string; secondsRemaining:number; credits:number; panelUsed?:boolean; mmiUsed?:boolean; processingPaused?:boolean }
export async function interviewAccess(userId:string):Promise<InterviewAccess> {
  const {data,error}=await createAdminClient().rpc('interview_trial_access',{p_user:userId})
  if(error||!data)return {kind:'unavailable',secondsRemaining:0,credits:0}
  return data as InterviewAccess
}
export function normaliseTrialEmail(email:string) {
  let [local,domain]=email.trim().toLowerCase().split('@')
  if(domain==='googlemail.com')domain='gmail.com'
  if(domain==='gmail.com')local=local.split('+')[0].replaceAll('.','')
  return `${local}@${domain}`
}
export async function requireInterviewPractice(user:{id:string;email?:string;email_confirmed_at?:string},stationId?:string,questionIndex=0,start=false) {
  let access=await interviewAccess(user.id)
  if(access.kind==='full')return access
  if(stationId&&!trialQuestionAllowed(stationId,questionIndex))throw new InterviewApiError('This question is included with full interview access.',403)
  if(!user.email_confirmed_at)throw new InterviewApiError('Verify your email before starting your interview trial.',403)
  if(access.kind==='eligible'&&start){
    const key=process.env.INTERVIEW_TRIAL_IDENTITY_SECRET
    if(!key||key.length<32||!user.email)throw new InterviewApiError('The free trial is being configured. Please try again shortly.',503)
    const identity=createHmac('sha256',key).update(normaliseTrialEmail(user.email)).digest('hex')
    const {data,error}=await createAdminClient().rpc('start_interview_trial',{p_user:user.id,p_identity:identity})
    if(error||data!==true)throw new InterviewApiError('This free trial could not be started. If you have used a trial before, upgrade to continue or contact support.',403)
    access=await interviewAccess(user.id)
  }
  if(access.kind==='expired')throw new InterviewApiError('Your free trial has ended. Your saved transcripts and feedback are still available. Upgrade to practise again.',403)
  if(!['active','eligible'].includes(access.kind))throw new InterviewApiError('Free interview practice is currently unavailable. Your saved work is still available.',503)
  return access
}
