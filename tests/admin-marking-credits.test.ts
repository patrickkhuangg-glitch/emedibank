import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fullDatabase } from './helpers/full-database.mjs'

const student = '00000000-0000-4000-8000-000000000001'
const admin = '00000000-0000-4000-8000-000000000002'
const tutor = '00000000-0000-4000-8000-000000000003'
const request = '00000000-0000-4000-8000-000000000004'

test('admin credit grants add both balances atomically, record attribution and deduplicate retries', async () => {
  const db = await fullDatabase()
  try {
    await db.exec(`insert into auth.users(id) values('${student}'),('${admin}'),('${tutor}');
      update profiles set role='admin' where id='${admin}'; update profiles set role='tutor' where id='${tutor}';
      update profiles set essay_credits=10,mmi_credits=3 where id='${student}';`)
    const grant = async (essay=4, interview=12, id=request, actor=admin, target=student, note='Package top-up') =>
      (await db.query<{result:{status:string;essay_credits:number;mmi_credits:number}}>('select add_admin_marking_credits($1,$2,$3,$4,$5,$6) result', [id,actor,target,essay,interview,note])).rows[0].result
    const balances = async () => (await db.query<{essay_credits:number;mmi_credits:number}>('select essay_credits,mmi_credits from profiles where id=$1',[student])).rows[0]
    for (const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`)
      await assert.rejects(grant(), /permission denied/)
      await assert.rejects(db.query('select * from admin_marking_credit_grants'), /permission denied/)
      await db.exec('reset role')
    }
    await db.exec('set role service_role')
    await assert.rejects(grant(4,12,request,student), /admin_required/)
    await assert.rejects(grant(4,12,request,tutor), /admin_required/)
    assert.equal((await grant(4,12,request,admin,tutor)).status, 'student_unavailable')
    for (const [essay,interview] of [[0,0],[-1,2],[1,-2],[10001,1],[1,10001]]) await assert.rejects(grant(essay,interview), /invalid_credit_grant/)
    await assert.rejects(grant(1.5,0), /invalid input syntax/)
    await assert.rejects(grant(1,0,request,admin,student,'x'.repeat(501)), /invalid_credit_grant/)
    assert.deepEqual(await grant(), {status:'added',essay_credits:14,mmi_credits:15})
    assert.equal((await grant()).status,'already_applied')
    assert.equal((await grant(5)).status,'request_conflict')
    assert.deepEqual(await balances(),{essay_credits:14,mmi_credits:15})
    const records=(await db.query<{actor_id:string;essay_amount:number;interview_amount:number;note:string}>('select actor_id,essay_amount,interview_amount,note from admin_marking_credit_grants')).rows
    assert.deepEqual(records,[{actor_id:admin,essay_amount:4,interview_amount:12,note:'Package top-up'}])
    // Current balances are incremented, never overwritten by an earlier page snapshot.
    await db.exec(`reset role; update profiles set essay_credits=essay_credits-2,mmi_credits=mmi_credits-1 where id='${student}';set role service_role`)
    const distinct=['00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000006']
    await Promise.all([grant(3,0,distinct[0]),grant(0,2,distinct[1])])
    assert.deepEqual(await balances(),{essay_credits:15,mmi_credits:16})
    // A balance overflow rolls back BOTH amounts and the ledger row.
    await db.exec(`reset role;update profiles set essay_credits=2147483647 where id='${student}';set role service_role`)
    const overflow='00000000-0000-4000-8000-000000000007'
    await assert.rejects(grant(1,1,overflow), /out of range/)
    assert.equal((await balances()).mmi_credits,16)
    assert.equal((await db.query('select id from admin_marking_credit_grants where id=$1',[overflow])).rows.length,0)
  } finally { await db.close() }
})
