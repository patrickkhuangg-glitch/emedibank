import 'server-only'
import { getUser } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
export class InterviewApiError extends Error { constructor(message:string,public status=400){super(message)} }
export async function ownedAttempt(id:string) {
 const user=await getUser()
 if(!user) throw new InterviewApiError('Sign in required.',401)
 const db=createAdminClient()
 const {data:attempt,error}=await db.from('interview_attempts').select('*').eq('id',id).eq('user_id',user.id).maybeSingle()
 if(error||!attempt) throw new InterviewApiError('Recording not found.',404)
 return {user,db,attempt}
}
export function apiError(error:unknown) {
 return Response.json({error:error instanceof InterviewApiError?error.message:'This operation could not be completed. Please try again.'},{status:error instanceof InterviewApiError?error.status:503})
}
export async function readSmallJson(request:Request):Promise<Record<string,unknown>> {
 const reader=request.body?.getReader(); if(!reader) throw new InterviewApiError('Request data is required.')
 const chunks:Uint8Array[]=[]; let length=0
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>32768){await reader.cancel();throw new InterviewApiError('Request is too large.',413)}chunks.push(value)}
 try{const value=JSON.parse(Buffer.concat(chunks).toString());if(!value||typeof value!=='object'||Array.isArray(value))throw 0;return value}catch{throw new InterviewApiError('Invalid request data.')}
}
