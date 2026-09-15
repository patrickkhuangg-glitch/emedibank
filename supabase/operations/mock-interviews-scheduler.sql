-- Operator setup for the existing Supabase project; no additional paid scheduler.
-- First create the Vault secret named studocyte_interview_worker_secret with the
-- same value as Vercel INTERVIEW_WORKER_SECRET. Never commit its value here.
-- The job starts paused. Activate only after the matching app is deployed:
-- select cron.alter_job(jobid, active := true) from cron.job
-- where jobname = 'studocyte-interview-processing';
begin;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'studocyte-interview-processing',
  '* * * * *',
  $job$
    select net.http_post(
      url := 'https://studocyte.emeducate.com.au/api/internal/interviews/process',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'studocyte_interview_worker_secret'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    )
    where exists (
      select 1 from public.interview_processing_jobs
      where (status in ('queued','failed') and available_at <= now())
         or (status = 'running' and locked_at < now() - interval '10 minutes')
    )
    and exists (
      select 1 from vault.decrypted_secrets
      where name = 'studocyte_interview_worker_secret'
        and length(decrypted_secret) >= 32
    );
  $job$
);
select cron.alter_job(jobid, active := false) from cron.job
where jobname = 'studocyte-interview-processing';
commit;

-- Vercel retains the once-daily cleanup schedule. Do not also schedule cleanup
-- here unless deliberately replacing that schedule.
-- Rollback: pause only this named job; never drop pg_cron or unrelated jobs.
