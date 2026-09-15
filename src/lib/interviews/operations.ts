import 'server-only'
import {createAdminClient} from '@/lib/supabase/admin'
export async function recordInterviewOperation(id:string,operation:'processing'|'cleanup',outcome?:'ok'|'failed',processed=0){
 try{const {error}=await createAdminClient().rpc('record_interview_operation',{p_id:id,p_operation:operation,...(outcome?{p_outcome:outcome}:{}),p_processed:processed})
 if(error)throw new Error('monitor_write_failed')
 }catch{console.error(JSON.stringify({event:'interview_operations',operation,outcome:'monitor_write_failed'}))}
}
