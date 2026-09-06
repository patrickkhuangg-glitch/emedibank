import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateMedia,mediaExtension,validateDuration,validateQuestionEvents,stationSnapshot,canSubmit,statusLabel,retryDelay,retentionEligible,retentionDays } from '../src/lib/interviews/video-validation'
import { validateAssessment,validateFeedback,validateAudit,manualFeedback } from '../src/lib/interviews/marking-validation'
import { recordingTypes } from '../src/lib/interviews/recording'
import { validWorkerSecret } from '../src/lib/interviews/worker-auth'
export function validFeedback(){return {overall:{score:5.5,band:'Strong developing response',summary:'Explains the trade-off and a safe next step.'},domains:[{key:'communication',label:'Communication',applicable:true,score:5.5,evidence:['Explains the priorities.'],comment:'Use a shorter opening.'}],strengths:['A clear next step.'],priorities:['Clarify the trade-off.'],practice_task:'Answer again with a one-sentence opening.',reviewer_note:'Reviewed and approved by an EMeducate reviewer.'}}
test('media allowlists, codecs, size and duration bounds',()=>{
 for(const type of ['video/webm;codecs=vp8,opus','video/mp4'])assert.doesNotThrow(()=>validateMedia(type,1024,'video'))
 for(const type of ['video/mov','audio/webm','text/html'])assert.throws(()=>validateMedia(type,1000,'video'))
 for(const bytes of [0,-1,NaN,Infinity,150*1024*1024+1])assert.throws(()=>validateMedia('video/mp4',bytes,'video'))
 assert.equal(mediaExtension('audio/mpeg','audio'),'mp3')
 assert.throws(()=>validateMedia('audio/webm',25*1024*1024,'audio'))
 assert.equal(validateDuration(480.1,'mmi'),481)
 for(const d of [0,-1,491,NaN,Infinity,'480'])assert.throws(()=>validateDuration(d,'mmi'))
 assert.throws(()=>validateDuration(191,'panel'))
 assert.equal(recordingTypes(t=>t==='video/mp4').video,'video/mp4')
 assert.equal(recordingTypes(t=>t==='video/mp4').audio,undefined)
 assert.throws(()=>recordingTypes(()=>false))
})
test('canonical station snapshot and bounded question offsets',()=>{
 const station=stationSnapshot('mmi','mmi-confidentiality-patient-safety')
 assert.equal(station.snapshot_version,1);assert.equal(station.timing.response_seconds,480)
 assert.equal(stationSnapshot('panel','panel-motivation').questions.length,1)
 assert.throws(()=>stationSnapshot('mmi','forged'));assert.throws(()=>stationSnapshot('invalid','panel-motivation'))
 const events=[{question_index:0,offset_seconds:0},{question_index:1,offset_seconds:92.4}]
 assert.deepEqual(validateQuestionEvents(events,4,100),events)
 for(const input of [null,[],[{question_index:1,offset_seconds:0}],[...events,{question_index:2,offset_seconds:80}],[{question_index:0,offset_seconds:Infinity}],[...events,{question_index:4,offset_seconds:100}]])assert.throws(()=>validateQuestionEvents(input,4,100))
})
test('submission eligibility, retry bounds and student-safe labels',()=>{
 assert.equal(canSubmit({upload_status:'ready',marking_status:null,video_deleted_at:null}),true)
 for(const state of ['queued','released','ungradable'] as const)assert.equal(canSubmit({upload_status:'ready',marking_status:state,video_deleted_at:null}),false)
 assert.equal(statusLabel({marking_status:'queued',transcription_status:'failed'}),'Preparing transcript')
 assert.equal(statusLabel({marking_status:'processing',transcription_status:'ready'}),'Preparing tutor draft')
 assert.equal(statusLabel({marking_status:'released',transcription_status:'ready'}),'Feedback ready')
 assert.equal(retryDelay(1,1),30);assert.equal(retryDelay(2,1),60);assert.equal(retryDelay(30,1),3600)
})
test('strict feedback, evidence and audit validation rejects malformed or leaked fields',()=>{
 const f=validFeedback();assert.deepEqual(validateFeedback(f,'mmi'),f)
 for(const value of [{...f,private_reviewer_notes:'secret'},{...f,overall:{...f.overall,score:5.2}},{...f,practice_task:''},{...f,domains:[{...f.domains[0],applicable:false}]},{...f,domains:[f.domains[0],f.domains[0]]}])assert.throws(()=>validateFeedback(value,'mmi'))
 assert.throws(()=>validateFeedback(manualFeedback('panel'),'panel'))
 const a={format:'mmi',station_id:'station',feedback:f,observations:[{domain_key:'communication',question_index:0,offset_seconds:null,observation:'An ordered answer',confidence:'high'}],flags:[]}
 assert.doesNotThrow(()=>validateAssessment(a,'mmi','station',4,480))
 assert.throws(()=>validateAssessment(a,'panel','station',4,480));assert.throws(()=>validateAssessment({...a,observations:[]},'mmi','station',4,480));assert.throws(()=>validateAssessment({...a,observations:[{...a.observations[0],question_index:8}]},'mmi','station',4,480))
 assert.doesNotThrow(()=>validateAudit({warnings:[],requires_human_attention:false},4))
 assert.throws(()=>validateAudit({warnings:[{category:'invented',detail:'x'}],requires_human_attention:true},4))
})
test('retention preserves pending reviews and expired media is not reprocessed',()=>{
 const now=Date.parse('2026-09-06'),base={media_kind:'video' as const,marking_status:null,created_at:'2026-01-01',released_at:null,video_deleted_at:null,upload_status:'ready' as const}
 assert.equal(retentionEligible(base,now),true)
 for(const marking_status of ['queued','processing','awaiting_review','in_review','needs_attention'] as const)assert.equal(retentionEligible({...base,marking_status},now),false)
 assert.equal(retentionEligible({...base,marking_status:'released',released_at:'2026-09-01'},now),false)
 assert.equal(retentionEligible({...base,media_kind:'audio'},now),false)
 assert.equal(retentionEligible({...base,video_deleted_at:'2026-09-01'},now),false)
 assert.equal(retentionDays(undefined),90);assert.equal(retentionDays('invalid'),90);assert.equal(retentionDays('30'),30);assert.equal(retentionDays('0'),90)
})
test('worker rejects absent, short, wrong and malformed secrets',()=>{
 const secret='a'.repeat(40)
 for(const header of [null,'',`Bearer ${'b'.repeat(40)}`,`Basic ${secret}`,`Bearer ${secret}x`])assert.equal(validWorkerSecret(header,secret),false)
 assert.equal(validWorkerSecret(`Bearer ${secret}`,undefined),false)
 assert.equal(validWorkerSecret('Bearer short','short'),false)
 assert.equal(validWorkerSecret(`Bearer ${secret}`,secret),true)
})
