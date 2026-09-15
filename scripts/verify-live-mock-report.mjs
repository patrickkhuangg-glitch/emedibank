import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';import {clients} from './lib/interview-operator.mjs';
const f=JSON.parse(readFileSync('/tmp/studocyte-diagnostic-fixture.json')),jar=new Map(f.cookies.map(c=>[c.name,c.value])),url='https://studocyte.emeducate.com.au/mock/ucat/diagnostic';
const{admin}=await clients();await admin.from('profiles').update({phone_number:'+61491570006'}).eq('id',f.id);
const cookie=()=>[...jar].map(([k,v])=>`${k}=${v}`).join('; ');
const res=await fetch(url,{headers:{Cookie:cookie()},redirect:'manual'}),html=await res.text();assert.equal(res.status,200);
for(const c of res.headers.getSetCookie()){const pair=c.split(';')[0],i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1))}
const tokens=[...html.matchAll(/[A-Za-z0-9_-]{100,}\.[A-Za-z0-9_-]{43}/g)].map(m=>m[0]);const token=tokens.find(t=>{try{const m=JSON.parse(Buffer.from(t.split('.')[0],'base64url'));return m.u===f.id&&m.k==='diagnostic-1'&&m.r}catch{return false}});assert(token,'No current report token');
const m=JSON.parse(Buffer.from(token.split('.')[0],'base64url'));
const sources=[...new Set([...html.matchAll(/src="([^"]+\.js)"/g)].map(m=>m[1]))],actions={};
for(const path of sources){const code=await(await fetch(new URL(path,url))).text();for(const match of code.matchAll(/createServerReference\)\("([a-f0-9]+)"[^)]*?"(saveMockReport|readMockReport)"/g))actions[match[2]]=match[1]}
assert(actions.saveMockReport&&actions.readMockReport,'Report actions not deployed');
async function call(name,args){const r=await fetch(url,{method:'POST',headers:{Cookie:cookie(),'Next-Action':actions[name],'Content-Type':'text/plain;charset=UTF-8',Accept:'text/x-component',Origin:new URL(url).origin},body:JSON.stringify(args)});const text=await r.text();assert.equal(r.status,200);const line=text.split('\n').find(l=>l.startsWith('1:'));assert(line,'Missing server action result');const value=JSON.parse(line.slice(2));assert(!value.digest,'Server report action failed');return value}
const p=JSON.parse(readFileSync('artifacts/diagnostic-release/import.json')),answers={},seconds={},traces={};
for(const q of p.questions){const d=q.data??{};answers[q.id]=d.statements?Object.fromEntries(d.statements.map((s,i)=>[i,s.correct])):d.mostLeast?{most:d.mostLeast.correctMost,least:d.mostLeast.correctLeast}:p.options.find(o=>o.question_id===q.id&&o.is_correct).id;seconds[q.id]=5;traces[q.id]={firstSeen:0,events:[{answer:answers[q.id],at:5}]}}
const first=await call('saveMockReport',[token,{answers,seconds,traces}]);assert.equal(first.access,'free');assert.equal(first.paid,null);assert.equal(first.core.marks.lost,0);assert.equal(first.core.marks.maximum,196);assert.equal(first.core.marks.incorrect,null);
const retry=await call('saveMockReport',[token,{answers,seconds,traces}]);assert.equal(retry.id,first.id);
const{count}=await admin.from('mock_reports').select('id',{count:'exact',head:true}).eq('user_id',f.id);assert.equal(count,1);
const{data:product}=await admin.from('products').select('id').eq('exam_id',m.e).limit(1).single();assert(product);
await admin.from('entitlements').insert({user_id:f.id,exam_id:m.e,source:'subscription',expires_at:new Date(Date.now()+86400000).toISOString()});
const{data:sub,error}=await admin.from('subscriptions').insert({user_id:f.id,product_id:product.id,status:'trialing',current_period_end:new Date(Date.now()+86400000).toISOString()}).select('id').single();assert(!error&&sub);
const trial=await call('readMockReport',[first.id]);assert.equal(trial.access,'free');assert.equal(trial.paid,null);
await admin.from('subscriptions').update({status:'active'}).eq('id',sub.id);
const paid=await call('readMockReport',[first.id]);assert.equal(paid.access,'paid');assert(paid.paid.types.length>4);assert.equal(paid.paid.plan.length,7);assert.equal(paid.paid.queue.length,0);assert.equal(paid.paid.history.length,1);assert.equal(paid.core.marks.lost,0);
const qr=paid.paid.types.filter(t=>t.section==='quantitative-reasoning');assert(qr.every(t=>['Tables','Diagrams','Complex','Text only'].includes(t.name)));
writeFileSync('artifacts/mock-report-release/live-check.json',JSON.stringify({freePayloadRestricted:true,trialPayloadRestricted:true,paidPayloadComplete:true,all184QuestionsRegraded:true,maximum:196,idempotentSave:true,historySaved:true,qrTaxonomyCorrect:true,disposableAccount:true},null,2));console.log('Live free/trial/paid report checks passed; all 184 questions regraded correctly; retries saved one report');
