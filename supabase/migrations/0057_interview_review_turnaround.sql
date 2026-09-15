-- Two working days = 48 local weekday hours; weekends do not consume time.
-- Sydney calendar time is intentional across daylight-saving changes.
create function public.interview_review_due_at(submitted timestamptz) returns timestamptz
language plpgsql stable strict set search_path=public,pg_temp as $$
declare cursor_at timestamp:=submitted at time zone 'Australia/Sydney'; remaining interval:=interval '48 hours'; boundary timestamp; available interval;
begin
 loop
  boundary:=date_trunc('day',cursor_at)+interval '1 day';
  if extract(isodow from cursor_at) in (6,7) then cursor_at:=boundary;continue;end if;
  available:=boundary-cursor_at;
  if remaining<=available then return (cursor_at+remaining) at time zone 'Australia/Sydney';end if;
  remaining:=remaining-available;cursor_at:=boundary;
 end loop;
end $$;
revoke all on function public.interview_review_due_at(timestamptz) from public,anon,authenticated;
grant execute on function public.interview_review_due_at(timestamptz) to service_role;

create or replace view public.interview_overdue_reviews with(security_invoker=true) as
 select a.id,'attempt'::text kind,a.station_title title,a.marking_status status,a.submitted_for_marking_at submitted_at,
 a.video_deleted_at is null and a.recording_expires_at<=now() recording_protected
 from public.interview_attempts a
 where a.marking_status in ('queued','processing','awaiting_review','in_review','needs_attention')
 and public.interview_review_due_at(a.submitted_for_marking_at)<=now()
 and not exists(select 1 from public.interview_mock_marking_members x where x.attempt_id=a.id)
 union all
 select m.id,'panel','Full panel interview',m.status,m.created_at,
 exists(select 1 from public.interview_mock_marking_members x join public.interview_attempts a on a.id=x.attempt_id where x.marking_id=m.id and a.video_deleted_at is null and a.recording_expires_at<=now())
 from public.interview_mock_markings m
 where m.status not in ('released','ungradable') and public.interview_review_due_at(m.created_at)<=now();
revoke all on public.interview_overdue_reviews from public,anon,authenticated;
grant select on public.interview_overdue_reviews to service_role;
