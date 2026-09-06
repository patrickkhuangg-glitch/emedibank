import { apiError,ownedAttempt } from '@/lib/interviews/api'
import { deleteInterviewAttempt } from '@/lib/interviews/storage-cleanup'
export async function DELETE(_request:Request,{params}:{params:Promise<{attemptId:string}>}){
 try{const {attemptId}=await params;const {attempt}=await ownedAttempt(attemptId);await deleteInterviewAttempt(attempt);return Response.json({ok:true})}catch(error){return apiError(error)}
}
