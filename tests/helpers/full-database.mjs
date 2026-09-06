import { PGlite } from '@electric-sql/pglite'
import { readdirSync,readFileSync } from 'node:fs'

export async function fullDatabase() {
  const db=new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email text,raw_app_meta_data jsonb default '{}',raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text unique,metadata jsonb);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
    grant usage on schema public,auth,storage to anon,authenticated,service_role;
    grant all on all tables in schema storage to authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;`)
  for(const name of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort()) {
    try {await db.exec(readFileSync(`supabase/migrations/${name}`,'utf8'))}
    catch(e) {await db.close();throw new Error(`${name}: ${e.message}`)}
  }
  return db
}
