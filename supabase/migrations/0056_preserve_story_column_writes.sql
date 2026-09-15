begin;
-- Restoring table grants does not restore the column-level writes defined by
-- 0040/0047. Keep IDs, owner, timestamps and version immutable after creation.
grant insert(id,user_id,title,theme,context,actions,reflection,prompt_id)
  on public.interview_stories to authenticated;
grant update(title,theme,context,actions,reflection,prompt_id)
  on public.interview_stories to authenticated;
commit;
