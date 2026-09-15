import {schedulerQueuePredicate} from './interview-scheduler.mjs';
export const retentionDispatchPredicate=`(exists (
 select 1 from public.interview_attempts where video_deleted_at is null and (
  (upload_status='ready' and recording_expires_at<=now() and (marking_status is null or marking_status in ('released','ungradable')))
  or (upload_status in ('awaiting_upload','uploading','failed') and duration_seconds=0 and marking_status is null and created_at<now()-interval '24 hours')
 )
) or exists (
 select 1 from public.interview_processing_jobs where job_type='cleanup' and attempt_count<max_attempts and (
  (status in ('queued','failed') and available_at<=now()) or (status='running' and locked_at<now()-interval '10 minutes')
 )
))`;
// Reuse the configured private URL/header expressions; never write secret values.
export function cleanupSchedulerCommand(command){
 const path='/api/internal/interviews/process';
 if(command.split(path).length!==2)throw Error('Unexpected worker endpoint; no scheduler change made');
 const predicate=schedulerQueuePredicate(command);
 return command.replace(path,'/api/internal/interviews/cleanup').replace(predicate,()=>retentionDispatchPredicate);
}
