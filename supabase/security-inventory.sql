-- Read-only catalogue inventory. Run in each hosted project too; local migrations
-- cannot prove the absence of dashboard-created objects or configuration drift.
select jsonb_build_object(
  'relations', (select jsonb_agg(jsonb_build_object('schema',n.nspname,'name',c.relname,'kind',c.relkind,
    'rls',c.relrowsecurity,'options',c.reloptions,'grants',c.relacl))
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','storage','realtime') and c.relkind in ('r','p','v','m')),
  'functions',(select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,
    'security_definer',p.prosecdef,'settings',p.proconfig,'grants',p.proacl))
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'),
  'policies',(select jsonb_agg(to_jsonb(p)) from pg_policies p where schemaname in ('public','storage','realtime')),
  'column_grants',(select jsonb_agg(to_jsonb(g)) from information_schema.column_privileges g
    where table_schema='public' and grantee in ('anon','authenticated')),
  'buckets',(select jsonb_agg(jsonb_build_object('id',id,'public',public,'size_limit',file_size_limit,'mime_types',allowed_mime_types)) from storage.buckets),
  'publications',(select jsonb_agg(to_jsonb(p)) from pg_publication_tables p),
  'default_grants',(select jsonb_agg(jsonb_build_object('owner',defaclrole::regrole::text,'type',defaclobjtype,'grants',defaclacl)) from pg_default_acl)
) as inventory;
