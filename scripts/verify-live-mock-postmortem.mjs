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
const wrong=p.questions.find(q=>q.difficulty==='easy'&&!q.data?.statements&&!q.data?.mostLeast),correct=p.questions.find(q=>q.id!==wrong.id&&!q.data?.statements&&!q.data?.mostLeast);
const wrongOpts=p.options.filter(o=>o.question_id===wrong.id),rightIndex=wrongOpts.findIndex(o=>o.is_correct);answers[wrong.id]=wrongOpts[rightIndex<2?3:0].id;
traces[wrong.id]={firstSeen:0,events:[{answer:answers[wrong.id],at:1300}]};
confidence[wrong.id]={value:'Confident',answerKey:key(answers[wrong.id])};confidence[correct.id]={value:'Guessed',answerKey:key(answers[correct.id])};
const stale=p.questions.find(q=>q.id!==wrong.id&&q.id!==correct.id);confidence[stale.id]={value:'Confident',answerKey:'stale-response'};
const first=await call('saveMockReport',[token,{answers,seconds,traces,confidence}]);assert(!first.digest);assert.equal(first.access,'free');assert.equal(first.paid,null);assert.equal(first.core.marks.lost,1);assert.equal(first.confidenceChoices[wrong.id],'Confident');assert.equal(first.confidenceChoices[correct.id],'Guessed');assert(!first.confidenceChoices[stale.id]);

const{data:product}=await admin.from('products').select('id').eq('exam_id',m.e).limit(1).single();assert(product);
await admin.from('entitlements').insert({user_id:f.id,exam_id:m.e,source:'subscription',expires_at:new Date(Date.now()+86400000).toISOString()});
const{data:sub,error}=await admin.from('subscriptions').insert({user_id:f.id,product_id:product.id,status:'active',current_period_end:new Date(Date.now()+86400000).toISOString()}).select('id').single();assert(!error&&sub);
let paid=await call('readMockReport',[first.id]);assert.equal(paid.paid.postMortem.sessions.length,3);assert.equal(paid.paid.postMortem.comparison,null);assert.equal(paid.paid.postMortem.easy.marks,1);assert.equal(paid.paid.postMortem.opportunities.total,1);assert.equal(paid.paid.postMortem.opportunities.estimated,null);
const {data:row}=await admin.from('mock_reports').select('*').eq('id',first.id).single();assert(row.facts.every(q=>q.difficulty));
const target=row.facts.find(q=>q.id===wrong.id);const pastId=crypto.randomUUID();
const pastFacts=[...row.facts.map(q=>({...q,id:crypto.randomUUID()})),...Array.from({length:5},(_,i)=>({...target,id:crypto.randomUUID(),score:i<4?1:0}))];
const {error:insertError}=await admin.from('mock_reports').insert({...row,id:pastId,facts:pastFacts,label:'Disposable previous mock',completed_at:new Date(new Date(row.completed_at).getTime()-86400000).toISOString()});assert(!insertError);
paid=await call('readMockReport',[first.id]);const pm=paid.paid.postMortem;
assert.equal(pm.comparison.label,'Disposable previous mock');assert.equal(pm.opportunities.covered,1);assert(pm.opportunities.estimated>0&&pm.opportunities.estimated<=1);assert.equal(pm.opportunities.rows.reduce((n,r)=>n+r.marks,0),1);
const labelled=await call('classifyMockError',[first.id,wrong.id,'Misread the question']);assert.equal(labelled.paid.postMortem.reasons[0].category,'Misread the question');assert(labelled.paid.postMortem.sessions[2].title.includes('misread'));
await admin.from('subscriptions').update({status:'trialing'}).eq('id',sub.id);const trial=await call('readMockReport',[first.id]);assert.equal(trial.paid,null);assert(!JSON.stringify(trial).includes('postMortem'));
writeFileSync('artifacts/mock-postmortem-release/live-check.json',JSON.stringify({difficultySaved:true,easyMissesUseBankLabels:true,threeSessionsGenerated:true,previousMockComparison:true,historyBasedEstimate:pm.opportunities.estimated,noDoubleCounting:true,labelUpdatesPostMortem:true,freeTrialRestricted:true},null,2));console.log('Live post-mortem, difficulty, history-based estimate, updated reasons and trial restrictions passed');
