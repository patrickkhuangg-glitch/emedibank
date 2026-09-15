import {alertConfiguration} from '@/lib/interviews/operation-alerts'
import {getProfile} from '@/lib/auth/dal'
import {createAdminClient} from '@/lib/supabase/admin'
export async function GET(){
 const profile=await getProfile()
 if(profile?.role!=='admin')return Response.json({error:'Admin access required.'},{status:403})
 const {data,error}=await createAdminClient().rpc('read_interview_operations',{})
 if(error||!data)return Response.json({error:'Monitoring is unavailable.'},{status:503})
 return Response.json({...data as object,alerts_configured:!!alertConfiguration()},{headers:{'Cache-Control':'private, no-store'}})
}
