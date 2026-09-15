export const operationMessages:Record<string,string>={
 trial_spending:'Free-trial processing reached its spending warning or was paused. Review trial usage and the monthly allocation before raising the limit. This meter reserves estimated costs; check actual provider billing too. Paid access and saved work remain available.',
 recording_backups:'Recording backups need attention. Check the backup schedule, private R2 access and failed copies or deletions. Do not extend retention to work around a failed cleanup.',
 queue_delay:'Some work has waited over 15 minutes. Check the backlog and provider capacity.',
 processing_stalled:'Work is waiting but processing has not succeeded recently. Check the worker scheduler and deployment logs.',
 stale_workers:'A worker lease has expired. Check whether automatic recovery succeeds.',
 jobs_need_attention:'Some jobs exhausted retries. Open Processing operations to review them.',
 repeated_job_failures:'Several jobs have failed recently. Check provider limits and configuration.',
 cleanup_overdue:'Some recordings are overdue for deletion. Check the cleanup scheduler and storage access.',
 operation_failed:'A recent processing or cleanup run failed or did not finish. Check the deployment logs.',
 worker_bound_exceeded:'The worker limit was exceeded. Pause processing and investigate before resuming.',
 review_overdue:'Marking is overdue: two working days have passed, excluding weekends in Sydney time. Support should contact the student with an update and arrange tutor completion. Patrick is the primary owner; Elaine is the backup. Recordings stay protected until marking finishes.',
}
