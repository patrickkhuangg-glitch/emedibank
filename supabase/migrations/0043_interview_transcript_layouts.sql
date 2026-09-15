-- Private, disposable presentation cache. Original transcripts and jobs are untouched.
begin;
create table public.interview_transcript_layouts (
 attempt_id uuid primary key references public.interview_attempts(id) on delete cascade,
 source_hash text not null,
 questions_hash text not null,
 status text not null check(status in ('processing','ready','failed')),
 attempt_count integer not null default 1 check(attempt_count between 1 and 3),
 request_id uuid not null,
 started_at timestamptz not null default now(),
 layout jsonb,
 model text
);
alter table public.interview_transcript_layouts enable row level security;
revoke all on public.interview_transcript_layouts from public,anon,authenticated;
grant all on public.interview_transcript_layouts to service_role;

create function public.claim_interview_transcript_layout(p_attempt_id uuid,p_user_id uuid,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.interview_attempts; c public.interview_transcript_layouts; source text; questions text; count integer:=1;
begin
 select * into a from public.interview_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found or a.upload_status<>'ready' or a.transcription_status<>'ready' or coalesce(length(a.transcript),0) not between 1 and 100000 then return jsonb_build_object('status','unavailable'); end if;
 if jsonb_typeof(a.questions) is distinct from 'array' then return jsonb_build_object('status','unavailable'); end if;
 if jsonb_array_length(a.questions) not between 2 and 20 then return jsonb_build_object('status','unavailable'); end if;
 source:=md5(a.transcript); questions:=md5(to_jsonb(a.questions)::text);
 select * into c from public.interview_transcript_layouts where attempt_id=a.id;
 if found and c.source_hash=source and c.questions_hash=questions then
  if c.status='ready' then return jsonb_build_object('status','ready','layout',c.layout,'transcript',a.transcript,'questions',a.questions); end if;
  if c.status='processing' and c.started_at>now()-interval '90 seconds' then return jsonb_build_object('status','processing'); end if;
  if c.attempt_count>=3 then return jsonb_build_object('status','unavailable'); end if;
  if c.started_at>now()-interval '30 seconds' then return jsonb_build_object('status','processing'); end if;
  count:=c.attempt_count+1;
 end if;
 insert into public.interview_transcript_layouts(attempt_id,source_hash,questions_hash,status,attempt_count,request_id,started_at)
 values(a.id,source,questions,'processing',count,p_request_id,now())
 on conflict(attempt_id) do update set source_hash=excluded.source_hash,questions_hash=excluded.questions_hash,status='processing',attempt_count=excluded.attempt_count,request_id=excluded.request_id,started_at=now(),layout=null,model=null;
 return jsonb_build_object('status','claimed','transcript',a.transcript,'questions',a.questions);
end $$;

create function public.complete_interview_transcript_layout(p_attempt_id uuid,p_user_id uuid,p_request_id uuid,p_layout jsonb,p_model text) returns boolean
language plpgsql security definer set search_path='' as $$
declare a public.interview_attempts; c public.interview_transcript_layouts;
begin
 select * into a from public.interview_attempts where id=p_attempt_id and user_id=p_user_id for update;
 if not found then return false; end if;
 select * into c from public.interview_transcript_layouts where attempt_id=a.id for update;
 if not found or c.status<>'processing' or c.request_id<>p_request_id or a.upload_status<>'ready' or a.transcription_status<>'ready' or c.source_hash<>md5(coalesce(a.transcript,'')) or c.questions_hash<>md5(to_jsonb(a.questions)::text) then return false; end if;
 if p_layout is not null and (jsonb_typeof(p_layout)<>'object' or p_layout->>'version' is distinct from '1' or jsonb_typeof(p_layout->'spans') is distinct from 'array' or octet_length(p_layout::text)>100000) then raise exception 'Invalid transcript layout'; end if;
 update public.interview_transcript_layouts set status=case when p_layout is null then 'failed' else 'ready' end,layout=p_layout,model=left(p_model,100) where attempt_id=a.id;
 return true;
end $$;
revoke all on function public.claim_interview_transcript_layout(uuid,uuid,uuid),public.complete_interview_transcript_layout(uuid,uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.claim_interview_transcript_layout(uuid,uuid,uuid),public.complete_interview_transcript_layout(uuid,uuid,uuid,jsonb,text) to service_role;
commit;
