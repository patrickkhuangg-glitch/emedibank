import {readFileSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';
const f=JSON.parse(readFileSync('/tmp/studocyte-diagnostic-fixture.json')),cookie=f.cookies.map(c=>`${c.name}=${c.value}`).join('; '),url='https://studocyte.emeducate.com.au/mock/ucat/diagnostic';
let requestCookie=cookie;
const res=await fetch(url,{headers:{Cookie:cookie},redirect:'manual'});const html=await res.text();
const jar=new Map(f.cookies.map(c=>[c.name,c.value]));for(const c of res.headers.getSetCookie()){const pair=c.split(';')[0],i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1))}requestCookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ');
const tokens=[...html.matchAll(/[A-Za-z0-9_-]{100,}\.[A-Za-z0-9_-]{43}/g)].map(m=>m[0]);
const token=tokens.find(t=>{try{return JSON.parse(Buffer.from(t.split('.')[0],'base64url')).u===f.id}catch{return false}});
assert(token,'No form token for the disposable account');
const sources=[...new Set([...html.matchAll(/src="([^"]+\.js)"/g)].map(m=>m[1]))];const actions={};
for(const path of sources){const code=await(await fetch(new URL(path,url))).text();for(const m of code.matchAll(/createServerReference\)\("([a-f0-9]+)"[^)]*?"(mockGradeSingleAction|mockGradeGridAction|mockGradeMostLeastAction)"/g))actions[m[2]]=m[1]}
const p=JSON.parse(readFileSync('artifacts/diagnostic-release/import.json'));const mcq=p.questions[0],grid=p.questions.find(q=>q.data.statements),ml=p.questions.find(q=>q.data.mostLeast);const option=p.options.find(o=>o.question_id===mcq.id&&o.is_correct);
assert(JSON.parse(Buffer.from(token.split('.')[0],'base64url')).q.includes(mcq.id),'Question missing from manifest');console.log({manifestQuestionCount:JSON.parse(Buffer.from(token.split('.')[0],'base64url')).q.length,signatureLength:token.split('.')[1].length,manifestRemainingMinutes:Math.round((JSON.parse(Buffer.from(token.split('.')[0],'base64url')).x-Date.now())/60000)});
const args=[['mockGradeSingleAction',mcq.id,option.id,5],['mockGradeGridAction',grid.id,Object.fromEntries(grid.data.statements.map((s,i)=>[i,s.correct])),6],['mockGradeMostLeastAction',ml.id,{most:ml.data.mostLeast.correctMost,least:ml.data.mostLeast.correctLeast},7]];
for(const [name,...values]of args){assert(actions[name]);const r=await fetch(url,{method:'POST',headers:{Cookie:requestCookie,'Next-Action':actions[name],'Content-Type':'text/plain;charset=UTF-8',Accept:'text/x-component',Origin:new URL(url).origin},body:JSON.stringify([token,...values])});const text=await r.text();assert.equal(r.status,200);if(!text.includes('"is_correct":true'))console.log({action:name,status:r.status,body:text.slice(-500)});assert(text.includes('"is_correct":true'),`${name} failed`)}
writeFileSync('artifacts/diagnostic-release/direct-recording-check.json',JSON.stringify({fixtureIdentityVerified:true,mcqCorrect:true,gridCorrect:true,mostLeastCorrect:true},null,2));console.log('Disposable identity verified; all three server grading actions passed');
