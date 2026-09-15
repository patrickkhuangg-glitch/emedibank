-- Correct a PL/pgSQL variable/column collision when checking scored global ratings.
-- No saved feedback or other review behaviour is changed.
begin;
-- Prepared locally; apply before enabling MMI feedback v2. No saved reports are rewritten.
-- Application validation additionally verifies canonical source text and every evidence reference.
create or replace function public.valid_mmi_feedback_v2(f jsonb) returns boolean
language plpgsql immutable set search_path=public,pg_temp as $$
declare d jsonb; n numeric;
begin
 if f->>'format_version' is distinct from 'mmi-feedback-v2' or f->>'rubric_version' is distinct from 'emeducate-mmi-2026-09-v2' or f->>'format' is distinct from 'mmi'
 or f ? 'practice_task' or not (f ?& array['station_id','specification','source','reviewer_evidence','reviewer_scope','domains','global','strengths','priorities','concerns','closing'])
 or jsonb_typeof(f->'reviewer_evidence') is distinct from 'array'
 or jsonb_typeof(f->'reviewer_scope') is distinct from 'object'
 or coalesce(f#>>'{reviewer_scope,media_inspected}','') not in ('none','audio','video')
 or coalesce(f#>>'{reviewer_scope,completeness}','') not in ('complete','partial','unknown')
 or coalesce(f#>>'{reviewer_scope,primary_task_coverage}','') not in ('full','excerpt','unknown')
 or jsonb_typeof(f->'domains') is distinct from 'array' or jsonb_array_length(f->'domains')<1
 or jsonb_typeof(f->'strengths') is distinct from 'array' or jsonb_typeof(f->'priorities') is distinct from 'array' or jsonb_typeof(f->'concerns') is distinct from 'array'
 or coalesce(length(trim(f#>>'{closing,verdict}')),0)=0 or coalesce(length(trim(f#>>'{closing,successful_improvement}')),0)=0
 or coalesce(length(trim(f#>>'{global,reason}')),0)=0 then return false; end if;
 for d in select * from jsonb_array_elements(f->'domains') loop
  if d->>'status' not in ('scored','insufficient_evidence','not_applicable') or d->>'status' is null or coalesce(length(trim(d->>'rationale')),0)=0 then return false; end if;
  if d->>'status'='scored' then
   if jsonb_typeof(d->'score') is distinct from 'number' or jsonb_typeof(d->'evidence') is distinct from 'array' or jsonb_array_length(d->'evidence')<1 or coalesce(length(trim(d->>'improvement')),0)=0 then return false; end if;
   n=(d->>'score')::numeric; if n<1 or n>7 or n<>trunc(n) then return false; end if;
  else
   if d->'score' is distinct from 'null'::jsonb or coalesce(d->>'improvement','')<>'' then return false; end if;
   if d->>'status'='insufficient_evidence' and coalesce(length(trim(d->>'needed_evidence')),0)=0 then return false; end if;
  end if;
 end loop;
 if f#>>'{global,status}'='scored' then
  if not exists(select 1 from jsonb_array_elements(f->'domains') as domain_items(value) where domain_items.value->>'status'='scored') or jsonb_typeof(f#>'{global,score}') is distinct from 'number' or (f#>>'{source,primary_task_coverage}'='excerpt' and not (coalesce(jsonb_array_length(f->'reviewer_evidence'),0)>0 and f#>>'{reviewer_scope,primary_task_coverage}'='full')) then return false; end if;
  n=(f#>>'{global,score}')::numeric; if n<1 or n>7 or n<>trunc(n) then return false; end if;
 elsif f#>>'{global,status}'='insufficient_evidence' then
  if f#>'{global,score}' is distinct from 'null'::jsonb then return false; end if;
 else return false; end if;
 return true;
exception when others then return false;
end $$;
revoke all on function public.valid_mmi_feedback_v2(jsonb) from public,anon,authenticated;
grant execute on function public.valid_mmi_feedback_v2(jsonb) to service_role;

commit;
