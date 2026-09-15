import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

test('practice log migration backfills only ready recordings, enforces ownership and ratings, and never duplicates a finalised response', async () => {
  const db=new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
      create table auth.users(id uuid primary key); insert into auth.users values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
      create table public.interview_attempts(id uuid primary key,user_id uuid references auth.users,station_id text,format text,created_at timestamptz,duration_seconds integer,upload_status text);
      insert into public.interview_attempts values('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','mmi-resource-choice','mmi','2026-09-01T00:00:00Z',90,'ready'),('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','panel-motivation','panel','2026-09-01T00:00:00Z',90,'awaiting_upload');`)
    await db.exec(readFileSync(new URL('../supabase/migrations/0041_interview_practice_progress.sql',import.meta.url),'utf8'))
    assert.equal((await db.query('select * from interview_practice_logs')).rows.length,1)
    await db.exec("update interview_attempts set upload_status='ready' where id='10000000-0000-4000-8000-000000000002'; update interview_attempts set upload_status='ready';")
    assert.equal((await db.query('select * from interview_practice_logs')).rows.length,2)
    await db.exec("set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);")
    assert.equal((await db.query('select * from interview_practice_logs')).rows.length,1)
    await assert.rejects(db.exec('update interview_practice_logs set self_rating=5'),/permission denied/)
    await assert.rejects(db.exec('delete from interview_practice_logs'),/permission denied/)
    await db.exec('reset role')
    await assert.rejects(db.exec('update interview_practice_logs set self_rating=6'),/check constraint/)
    await db.exec("update interview_practice_logs set self_rating=4 where id='10000000-0000-4000-8000-000000000001'; update interview_attempts set upload_status='ready';")
    assert.equal((await db.query<{self_rating:number}>("select self_rating from interview_practice_logs where id='10000000-0000-4000-8000-000000000001'")).rows[0].self_rating,4)
    await db.exec("delete from interview_attempts where id='10000000-0000-4000-8000-000000000001'")
    assert.equal((await db.query('select * from interview_practice_logs')).rows.length,1)
  } finally { await db.close() }
})
