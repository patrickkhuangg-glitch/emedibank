import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';import {clients} from './lib/interview-operator.mjs';
const f=JSON.parse(readFileSync('/tmp/studocyte-diagnostic-fixture.json')),jar=new Map(f.cookies.map(c=>[c.name,c.value])),url='https://studocyte.emeducate.com.au/mock/ucat/diagnostic';
const{admin}=await clients();await admin.from('profiles').update({phone_number:'+61491570006'}).eq('id',f.id);
const cookie=()=>[...jar].map(([k,v])=>`${k}=${v}`).join('; ');
const res=await fetch(url,{headers:{Cookie:cookie()},redirect:'manual'}),html=await res.text();assert.equal(res.status,200);
for(const c of res.headers.getSetCookie()){const pair=c.split(';')[0],i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1))}
const tokens=[...html.matchAll(/[A-Za-z0-9_-]{100,}\.[A-Za-z0-9_-]{43}/g)].map(m=>m[0]);const token=tokens.find(t=>{try{const m=JSON.parse(Buffer.from(t.split('.')[0],'base64url'));return m.u===f.id&&m.k==='diagnostic-1'&&m.r}catch{return false}});assert(token,'No current report token');
const m=JSON.parse(Buffer.from(token.split('.')[0],'base64url'));
const sources=[...new Set([...html.matchAll(/src="([^"]+\.js)"/g)].map(m=>m[1]))],actions={};
for(const path of sources){const code=await(await fetch(new URL(path,url))).text();for(const match of code.matchAll(/createServerReference\)\("([a-f0-9]+)"[^)]*?"(saveMockReport|readMockReport|classifyMockError)"/g))actions[match[2]]=match[1]}
assert(actions.saveMockReport&&actions.readMockReport,'Report actions not deployed');
async function call(name,args){const r=await fetch(url,{method:'POST',headers:{Cookie:cookie(),'Next-Action':actions[name],'Content-Type':'text/plain;charset=UTF-8',Accept:'text/x-component',Origin:new URL(url).origin},body:JSON.stringify(args)});const text=await r.text();assert([200,500].includes(r.status));const line=text.split('\n').find(l=>l.startsWith('1:'));assert(line,'Missing server action result');const value=JSON.parse(line.slice(line.startsWith('1:E')?3:2));return value}

const p=JSON.parse(readFileSync('artifacts/diagnostic-release/import.json')),answers={},seconds={},traces={},confidence={};
const key=a=>typeof a==='object'&&a!==null?JSON.stringify(Object.entries(a).sort(([a],[b])=>a.localeCompare(b))):JSON.stringify(a);
for(const q of p.questions){const d=q.data??{};answers[q.id]=d.statements?Object.fromEntries(d.statements.map((s,i)=>[i,s.correct])):d.mostLeast?{most:d.mostLeast.correctMost,least:d.mostLeast.correctLeast}:p.options.find(o=>o.question_id===q.id&&o.is_correct).id;seconds[q.id]=5;traces[q.id]={firstSeen:0,events:[{answer:answers[q.id],at:5}]};confidence[q.id]={value:'Confident',answerKey:key(answers[q.id])}}
const wrong=p.questions.find(q=>!q.data?.statements&&!q.data?.mostLeast),correct=p.questions.find(q=>q.id!==wrong.id&&!q.data?.statements&&!q.data?.mostLeast);
answers[wrong.id]=p.options.find(o=>o.question_id===wrong.id&&!o.is_correct).id;
traces[wrong.id]={firstSeen:0,events:[{answer:answers[wrong.id],at:1300}]};
confidence[wrong.id]={value:'Confident',answerKey:key(answers[wrong.id])};confidence[correct.id]={value:'Guessed',answerKey:key(answers[correct.id])};
const stale=p.questions.find(q=>q.id!==wrong.id&&q.id!==correct.id);confidence[stale.id]={value:'Confident',answerKey:'stale-response'};
const first=await call('saveMockReport',[token,{answers,seconds,traces,confidence}]);assert(!first.digest);assert.equal(first.access,'free');assert.equal(first.paid,null);assert.equal(first.core.marks.lost,1);assert.equal(first.confidenceChoices[wrong.id],'Confident');assert.equal(first.confidenceChoices[correct.id],'Guessed');assert(!first.confidenceChoices[stale.id]);
const labelled=await call('classifyMockError',[first.id,wrong.id,'Calculation error']);assert.equal(labelled.annotations[0].category,'Calculation error');assert.equal(labelled.paid,null);
assert((await call('classifyMockError',[first.id,correct.id,'Calculation error'])).digest,'Correct answer must reject classification');
assert((await call('classifyMockError',[first.id,wrong.id,'Invalid reason'])).digest,'Invalid label must reject');
assert((await call('classifyMockError',[first.id,'00000000-0000-4000-8000-000000000000','Guessed'])).digest,'Foreign question must reject');
const{data:product}=await admin.from('products').select('id').eq('exam_id',m.e).limit(1).single();assert(product);
await admin.from('entitlements').insert({user_id:f.id,exam_id:m.e,source:'subscription',expires_at:new Date(Date.now()+86400000).toISOString()});
const{data:sub,error}=await admin.from('subscriptions').insert({user_id:f.id,product_id:product.id,status:'trialing',current_period_end:new Date(Date.now()+86400000).toISOString()}).select('id').single();assert(!error&&sub);
assert.equal((await call('readMockReport',[first.id])).paid,null);
await admin.from('subscriptions').update({status:'active'}).eq('id',sub.id);
let paid=await call('readMockReport',[first.id]);assert.equal(paid.access,'paid');assert.equal(paid.paid.confidence.recorded,183);assert.equal(paid.paid.confidence.groups.find(g=>g.key==='confident-wrong').count,1);assert.equal(paid.paid.confidence.groups.find(g=>g.key==='guessed-correct').count,1);assert(paid.paid.queue.some(q=>q.id===correct.id));assert.equal(paid.paid.errors.rows.find(r=>r.category==='Calculation error').marks,1);
const vr=paid.paid.timePressure.find(s=>s.section==='verbal-reasoning');assert.equal(vr.windows.find(w=>w.key==='five').marksLost,1);assert.equal(vr.windows.find(w=>w.key==='five').completed,1);
const {data:row}=await admin.from('mock_reports').select('*').eq('id',first.id).single();
// Only this disposable account receives synthetic earlier attempts for the five-mock aggregation check.
for(let i=1;i<=5;i++){const id=crypto.randomUUID();const {error}=await admin.from('mock_reports').insert({...row,id,completed_at:new Date(new Date(row.completed_at).getTime()-i*86400000).toISOString()});assert(!error);assert(!(await admin.from('mock_error_classifications').insert({report_id:id,question_id:wrong.id,category:'Calculation error'})).error)}
paid=await call('readMockReport',[first.id]);assert.equal(paid.paid.errors.mocks,5);assert.equal(paid.paid.errors.rows.find(r=>r.category==='Calculation error').marks,5);
const edited=await call('classifyMockError',[first.id,wrong.id,'Misread the question']);assert.equal(edited.paid.errors.rows.find(r=>r.category==='Calculation error').marks,4);assert.equal(edited.paid.errors.rows.find(r=>r.category==='Misread the question').marks,1);
const cleared=await call('classifyMockError',[first.id,wrong.id,null]);assert.equal(cleared.annotations.length,0);assert.equal(cleared.paid.errors.rows.find(r=>r.category==='Misread the question').marks,0);
const result={optionalConfidenceSaved:true,staleConfidenceRejected:true,confidenceCalibrationCorrect:true,guessedCorrectQueued:true,pressureUsesTimestamps:true,errorLabelsSavedEditedCleared:true,correctQuestionAndInvalidLabelRejected:true,lastFiveMockAggregationCorrect:true,freeAndTrialRestricted:true,paidReportComplete:true,disposableAccountOnly:true};writeFileSync('artifacts/mock-learning-release/live-check.json',JSON.stringify(result,null,2));console.log(result);
