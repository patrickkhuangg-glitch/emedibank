import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {clients,sql,q} from './lib/interview-operator.mjs'
const dir='artifacts/qr-explanations', subtest='86a52ac4-f2b9-40b8-997b-5e44de337f92'
const before=JSON.parse(readFileSync(`${dir}/before.json`)),updates=JSON.parse(readFileSync(`${dir}/updates.json`))
assert.equal(updates.length,124)
const {admin}=await clients()
async function fetchRows(){const {data,error}=await admin.from('questions').select('*, options:question_options(*), stimulus:stimuli(*)').eq('subtest_id',subtest).order('id').range(0,499);if(error)throw Error(error.message);return data}
const normalize=rows=>rows.map(r=>({...r,options:[...r.options].sort((a,b)=>a.id.localeCompare(b.id))})).sort((a,b)=>a.id.localeCompare(b.id))
const current=await fetchRows()
assert.deepEqual(normalize(current),normalize(before),'Question bank changed since backup; review before publishing')
writeFileSync(`${dir}/publish-before.json`,JSON.stringify(current,null,2)+'\n')
const payload=updates.map(u=>({id:u.id,original:u.original,explanation_text:u.explanation_text}))
const query=`DO $publish$ DECLARE item jsonb; affected integer; BEGIN
PERFORM id FROM public.questions WHERE subtest_id=${q(subtest)}::uuid FOR UPDATE;
IF (SELECT count(*) FROM public.questions WHERE subtest_id=${q(subtest)}::uuid) <> 124 THEN RAISE EXCEPTION 'QR bank count changed'; END IF;
FOR item IN SELECT value FROM jsonb_array_elements(${q(JSON.stringify(payload))}::jsonb) LOOP
UPDATE public.questions SET explanation_text=item->>'explanation_text' WHERE id=(item->>'id')::uuid AND subtest_id=${q(subtest)}::uuid AND explanation_text IS NOT DISTINCT FROM item->>'original';
GET DIAGNOSTICS affected = ROW_COUNT;
IF affected <> 1 THEN RAISE EXCEPTION 'Explanation changed or question missing: %',item->>'id'; END IF;
END LOOP; END $publish$;`
await sql(query,false)
const after=await fetchRows()
const expected=before.map(r=>({...r,explanation_text:updates.find(u=>u.id===r.id).explanation_text}))
assert.deepEqual(normalize(after),normalize(expected),'Post-publication verification failed')
writeFileSync(`${dir}/after.json`,JSON.stringify(after,null,2)+'\n')
writeFileSync(`${dir}/verification.json`,JSON.stringify({verifiedAt:new Date().toISOString(),updated:124,onlyExplanationTextChanged:true,answerKeysPreserved:true,allRowsMatchAuthoredContent:true},null,2)+'\n')
console.log('Verified all 124 published explanations; all other question, answer-option and stimulus fields unchanged.')
