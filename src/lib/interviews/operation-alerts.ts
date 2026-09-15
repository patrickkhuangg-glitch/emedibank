import 'server-only'
import {createAdminClient} from '@/lib/supabase/admin'
import {operationMessages} from './operation-messages'
type Delivery={id:string;code:string;kind:'opened'|'reminder'|'resolved';episode_at:string;created_at:string}
export function alertConfiguration(){
 const key=process.env.INTERVIEW_ALERT_RESEND_API_KEY,to=process.env.INTERVIEW_ALERT_EMAIL_TO,from=process.env.INTERVIEW_ALERT_EMAIL_FROM
 if(key&&to&&from&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to)&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from))return {kind:'email' as const,key,to,from,url:'https://api.resend.com/emails'}
 const raw=process.env.INTERVIEW_ALERT_WEBHOOK_URL
 if(!raw)return null
 try{const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password)return null;return {kind:'webhook' as const,url:url.toString()}}catch{return null}
}
export function formatOperationAlert(alert:Delivery){
 const heading=alert.code==='setup_test'?'Alert delivery test':alert.kind==='resolved'?'Recovered':alert.kind==='reminder'?'Still needs attention':'Needs attention'
 const message=alert.code==='setup_test'?'This is a setup test. Studocyte interview alerts are now connected to this email address. No student work requires action for this test.':alert.kind==='resolved'?`The ${alert.code.replaceAll('_',' ')} condition has cleared.`:operationMessages[alert.code]??'An interview operation needs attention.'
 return `Studocyte interviews · ${heading}\n${message}\nDetected: ${new Date(alert.episode_at).toISOString()}\nReview: https://studocyte.emeducate.com.au/admin/interviews`
}
export function alertRecipients(code:string,primary:string){
 const recipients=[primary]
 if(code==='review_overdue')recipients.push(process.env.INTERVIEW_SUPPORT_EMAIL??'support@emeducate.com.au',process.env.INTERVIEW_BACKUP_OPERATOR_EMAIL??'e.zhang@emeducate.com.au')
 if(recipients.some(email=>!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)))throw Error('invalid_alert_recipient')
 return [...new Set(recipients)]
}
export async function deliverInterviewAlerts(){
 const config=alertConfiguration()
 if(!config)return {configured:false,sent:0,failed:0}
 const db=createAdminClient(),worker=crypto.randomUUID();let sent=0,failed=0
 for(let i=0;i<5;i++){
  const {data,error}=await db.rpc('claim_interview_alert',{p_worker:worker})
  if(error)throw Error('alert_claim_failed')
  if(!data)break
  const alert=data as Delivery;let deliveryFailed=false
  try{
   // Stable idempotency key covers ambiguous provider responses. No student content in alerts.
   const text=formatOperationAlert(alert)
   const response=await fetch(config.url,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':`interview-alert/${alert.id}`,...(config.kind==='email'?{Authorization:`Bearer ${config.key}`}:{})},body:JSON.stringify(config.kind==='email'?{from:`Studocyte <${config.from}>`,to:alertRecipients(alert.code,config.to),subject:text.split('\n')[0],text}:{text}),redirect:'error',signal:AbortSignal.timeout(10000)})
   if(!response.ok)throw Error('delivery_failed')
   await response.body?.cancel()
  }catch{deliveryFailed=true}
  const finish=await db.rpc('finish_interview_alert',{p_id:alert.id,p_worker:worker,...(deliveryFailed?{p_error:'delivery_failed'}:{})})
  if(finish.error||!finish.data)throw Error('alert_receipt_failed')
  if(deliveryFailed){failed++;break}else sent++
 }
 return {configured:true,sent,failed}
}
