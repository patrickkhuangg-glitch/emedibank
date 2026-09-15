import test from 'node:test';
import assert from 'node:assert/strict';
import {fullDatabase} from './helpers/full-database.mjs';

test('current-schema hardening preserves private story writes and denies identity or balance changes', async () => {
  const db = await fullDatabase();
  const owner = '00000000-0000-0000-0000-000000000201';
  const other = '00000000-0000-0000-0000-000000000202';
  const story = '00000000-0000-0000-0000-000000000203';
  try {
    await db.exec(`insert into auth.users(id) values ('${owner}'),('${other}');
      set role authenticated; set request.jwt.claim.sub='${owner}';
      insert into interview_stories(id,user_id,title,theme,context,actions,reflection)
      values ('${story}','${owner}','Private story','Growth','Context','Actions','Reflection');
      update interview_stories set reflection='Revised reflection' where id='${story}';`);
    const {rows} = await db.query(`select reflection from interview_stories where id='${story}'`);
    assert.equal(rows[0].reflection, 'Revised reflection');
    for (const query of [
      `update interview_stories set user_id='${other}' where id='${story}'`,
      `update profiles set mmi_credits=100 where id='${owner}'`,
      `update profiles set role='admin' where id='${owner}'`,
      'truncate interview_stories',
      'select * from interview_markings',
      'select * from interview_mock_markings',
    ]) await assert.rejects(db.exec(query), /permission denied/);
    await db.exec(`set request.jwt.claim.sub='${other}'`);
    assert.equal((await db.query(`select * from interview_stories where id='${story}'`)).rows.length, 0);
    await db.exec(`delete from interview_stories where id='${story}'; reset role;`);
    assert.equal((await db.query(`select count(*)::int n from interview_stories where id='${story}'`)).rows[0].n, 1);
    const excessive = await db.query(`select c.relname from pg_class c
      join pg_namespace n on n.oid=c.relnamespace cross join pg_roles r
      where n.nspname='public' and c.relkind in ('r','p') and r.rolname in ('anon','authenticated')
      and (has_table_privilege(r.oid,c.oid,'TRUNCATE') or has_table_privilege(r.oid,c.oid,'TRIGGER')
        or has_table_privilege(r.oid,c.oid,'REFERENCES'))`);
    assert.equal(excessive.rows.length, 0);
  } finally { await db.close(); }
});
