import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {sql,q} from './lib/interview-operator.mjs';
const dir='artifacts/probability-removal-2026-09-09';
mkdirSync(dir,{recursive:true});
const scope=`subtest_id IN (SELECT s.id FROM subtests s JOIN exams e ON e.id=s.exam_id WHERE e.name='UCAT' AND s.name='Decision Making') AND (topic ILIKE '%probability%' OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE t ILIKE '%probability%'))`;
const rows=await sql(`SELECT * FROM questions WHERE ${scope} ORDER BY id`);
assert.equal(rows.length,50,'Expected the 50 inspected questions');
const ids=rows.map(x=>q(x.id)).join(',');
const options=await sql(`SELECT * FROM question_options WHERE question_id IN (${ids}) ORDER BY id`);
assert.ok(!existsSync(`${dir}/deleted-content.json`),'Recovery copy already exists; inspect prior run before retrying');
writeFileSync(`${dir}/deleted-content.json`,JSON.stringify({questions:rows,options},null,2));
async function remaining(){return sql(`SELECT id,md5(to_jsonb(t)::text) AS hash FROM questions t WHERE id NOT IN (${ids}) ORDER BY id`)}
const before=await remaining();
writeFileSync(`${dir}/other-questions-before.json`,JSON.stringify(before,null,2));
await sql(`DO $remove$ BEGIN
 LOCK TABLE questions IN SHARE ROW EXCLUSIVE MODE;
 LOCK TABLE question_attempts,practice_sessions,mock_question_assignments IN SHARE ROW EXCLUSIVE MODE;
 IF (SELECT count(*) FROM questions WHERE ${scope}) <> 50 OR (SELECT count(*) FROM questions WHERE ${scope} AND id IN (${ids})) <> 50 THEN RAISE EXCEPTION 'Probability scope changed'; END IF;
 IF EXISTS (SELECT 1 FROM question_attempts WHERE question_id IN (${ids})) OR EXISTS (SELECT 1 FROM practice_sessions WHERE question_ids && ARRAY[${ids}]::uuid[]) OR EXISTS (SELECT 1 FROM mock_question_assignments WHERE question_id IN (${ids})) THEN RAISE EXCEPTION 'Usage changed'; END IF;
 DELETE FROM questions WHERE id IN (${ids}) AND ${scope};
 IF EXISTS (SELECT 1 FROM questions WHERE ${scope}) THEN RAISE EXCEPTION 'Probability questions remain'; END IF;
 END $remove$;`,false);
assert.deepEqual(await remaining(),before,'Other question content changed');
const counts=await sql(`SELECT (SELECT count(*)::int FROM questions WHERE ${scope}) AS probability_remaining,(SELECT count(*)::int FROM question_options WHERE question_id IN (${ids})) AS orphan_options,(SELECT count(*)::int FROM questions WHERE published AND tags @> ARRAY['Venn Diagrams']::text[] AND subtest_id IN (SELECT s.id FROM subtests s JOIN exams e ON e.id=s.exam_id WHERE e.name='UCAT' AND s.name='Decision Making')) AS published_venn`);
assert.equal(counts[0].probability_remaining,0);assert.equal(counts[0].orphan_options,0);assert.equal(counts[0].published_venn,347);
const result={verifiedAt:new Date().toISOString(),deletedQuestions:rows.length,deletedOptions:options.length,otherQuestionsUnchanged:true,...counts[0]};
writeFileSync(`${dir}/verification.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
