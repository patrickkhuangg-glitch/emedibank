import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
const dir='artifacts/qr-explanations'
const groups=JSON.parse(readFileSync(`${dir}/review.json`))
const questions=groups.flatMap(g=>g.questions)
const before=JSON.parse(readFileSync(`${dir}/before.json`))
const blocks=readFileSync(`${dir}/authored.txt`,'utf8').trim().split(/\n\s*\n/)
const authored=new Map(blocks.map(b=>{const [key,information,working,distractors,...extra]=b.split('\n');assert.equal(extra.length,0,key);assert.ok(information&&working&&distractors,key);return [key,{information,working,distractors}]}))
assert.equal(authored.size,124)
assert.equal(blocks.length,124)
// Independently recompute every keyed result from the supplied quantities.
const results=[
80+90+75+105,150*4+75*3+90*5,60/260*100,'2 : 1',
240-216+180-153+160-144+120-102,(180-153)/180*100,160*1.25*(144/160),'24 : 17',
60/75*100,72+60+54+81,60*72-54*75,(80+75+60+90)/4,
5*2*8.6-72,19.8/60,(15-11.2)/11.2*100,'12 : 25',
2.4*5*7,2.5*1*3*.32,2*1.25*7-1.2*1.5*4,2.4*5*7*.75,
120+150+180,(160-80)/80*100,150*30,(125+130)/2,70+45-80-5,
12*8-4*3,2*(12+8),12+8,4*3/(12*8)*100,
Math.min(6+5,8+4,6+15+7),Math.min(6+5+7,8+4+7,6+15),(8+4)/12*60,6+5+7+7+4+8,
2.5*1.6*.9,2.5*1.6*1.2,2.5*1.6*(1.2-.9)*1000,2.5*1.6*.9*1000*.75,
144/360*3600,(108+72)/360*100,36/360*3600,72/360*3600*1.25,
45+80+50,'11:20',(15+10)/(45+15+80+10+50)*100,'11:00',
470-260,(350-200)/200*100,(620-200)/4,620+(620-470),Math.hypot(9,12),
.2*3.6+.1*5+.15*14,40*150/1000,Math.floor(100/(.2*3.6+.1*5+.15*14)),(.15*14*.1)/3.32*100,
'Y only',8*1.8*.8,6*.7,3*7+2*7*.8,
10*8*3+6*8*4+4*8*5,10*8*3*.8,10*8*3*.2+6*8*4*.25+4*8*5*.1,6*8*4*.25,
80*50+50*35+40*30,70*12,40*6+30*7,50/8,
120*.9,100*.75*30,120*.1+100*.25+80*.2,120*.9*40+100*.75*30+80*.8*20,
120*.4+80*.55,(100*.4+120*.55)*4.5,120*500+80*700,(100*.4+120*.55)*4.5-(120*.4+80*.55)*5,
(3*140+2*3*18+2*3*5)/.6,
240*.35,240*.65,240*.35*.4+240*.65*.3,240*.35*6+240*.65*4.5,
2.4*.65,2.4*.65+.42-.18,(2.4*.65+.42-.18)/2.4*100,Math.floor((1.8-1.5)/.06+1e-9)+1,
48000/12,48000/12*.06,48000/12*.94*.2,48000/12*.94*.8-1200,
5*400/1000,5*400/8,'Carla',21/7*4*400/1000,
20*3/5,20*2/5,'12 : 13',20*3/5/25*100,
180*2/5,180/3,180-180*2/5-180/3,40*24*.85+140*24,90-8*4+25,
(1200*20-(Math.min(18000*.7,1200*.95*.6*20)+Math.min(8000,1200*.95*.4*.9*20)))/(1200*20)*100,
1200*.95*.4*.9*20-8000,18000*.7/(1200*.95*.6),18000*.3+1200*.95*.6*10,
90/(80+90+105+120+150)*100,180*6+120*9,165/1.1,'81 : 55',
2*32*1.8+2*5,2*36+2*36*.6+4*6,24*1.8*.6+2*3+2*4,(4+2*4)/(28+4+2*4)*100,
144*76*.88-144*24/.5-150*3,((120-6)*70+(90-9)*68)*.12,(90-9)*68,(120-6)*28/.6+120*3,
96/16,110/11*1.8,'8 : 7',5*140-(120+150+180+90),
(4+8*2)*18*.5,250*.2-10+250*.8*.6,(250*.2-10)*2+250*.8*.6*(.25+2*.75),(160+130)*18+2*420-(4+8*2)*18*.5
]
assert.equal(results.length,124)
const updates=questions.map(question=>{
 const content=authored.get(question.key); assert.ok(content,question.key)
 const row=before.find(r=>r.id===question.id); assert.ok(row)
 const correct=row.options.filter(o=>o.is_correct);assert.equal(correct.length,1,question.key)
 const option=correct[0]; const expected=results[Number(question.key)-1];
 if(typeof expected==='string')assert.equal(option.body.replace(/\s+/g,' ').trim(),expected,question.key)
 else {
   const match=option.body.replaceAll(',','').match(/\d+(?:\.\d+)?/);assert.ok(match,question.key)
   const places=match[0].split('.')[1]?.length??0
   assert.equal(Number(expected.toFixed(places)),Number(match[0]),`${question.key}: calculated ${expected}, keyed ${option.body}`)
 }
 for(const wrong of row.options.filter(o=>!o.is_correct))assert.match(content.distractors,new RegExp(`\\b${wrong.label}\\b`),`${question.key} missing ${wrong.label}`)
 const explanation_text=`Correct answer: ${option.label} — ${option.body}\n\nInformation to use\n${content.information}\n\nWorking\n${content.working}\n\nWhy the other options are incorrect\n${content.distractors}`
 assert.ok(explanation_text.length>row.explanation_text.length,question.key)
 return {key:question.key,id:question.id,original:row.explanation_text,explanation_text,computedResult:expected,correctOption:option.label}
}).sort((a,b)=>a.key.localeCompare(b.key))
writeFileSync(`${dir}/updates.json`,JSON.stringify(updates,null,2)+'\n')
writeFileSync(`${dir}/explanations-review.md`,updates.map(u=>{const question=questions.find(q=>q.id===u.id);return `## ${u.key}: ${question.stem}\n\n${question.options.join('\n\n')}\n\n${u.explanation_text}`}).join('\n\n---\n\n')+'\n')
console.log(JSON.stringify({questions:updates.length,independentAnswerChecks:results.length,allDistractorsCovered:true,minWords:Math.min(...updates.map(u=>u.explanation_text.split(/\s+/).length)),maxWords:Math.max(...updates.map(u=>u.explanation_text.split(/\s+/).length))}))
