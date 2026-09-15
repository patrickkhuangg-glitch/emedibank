// This guard also wakes the worker for expired final-attempt leases so it can
// mark them as needing attention. Claim/retry limits remain enforced by the RPCs.
export const panelDispatchExists = `exists (
      select 1 from public.interview_mock_processing_jobs
      where (status in ('queued','failed') and available_at <= now())
         or (status = 'running' and locked_at < now() - interval '10 minutes')
    )`;
const attemptGuard = /where (exists \(\s*select 1 from public\.interview_processing_jobs\s*where \(status in \('queued',\s*'failed'\) and available_at <= now\(\)\)\s*or \(status = 'running' and locked_at < now\(\) - interval '10 minutes'\)\s*\))(?=\s*and exists \()/;
export function patchInterviewScheduler(command) {
 if(command.includes('public.interview_mock_processing_jobs'))throw Error('Panel scheduler guard already present; inspect instead of overwriting');
 const match=command.match(attemptGuard);
 if(!match)throw Error('Unexpected scheduler guard; no change made');
 return command.replace(attemptGuard,()=>`where (${match[1]} or ${panelDispatchExists})`);
}
export function schedulerQueuePredicate(command){
 const start=command.indexOf('where (exists (');
 const end=command.indexOf('\n    and exists (',start);
 if(start<0||end<0)throw Error('Scheduler predicate not recognised');
 return command.slice(start+6,end).trim();
}
