import { INTERVIEW_STATIONS } from './stations'
import { getInterviewQuestions, getInterviewTiming } from './timing'
import type { InterviewAttemptRow } from '../supabase/types'
export { VIDEO_LIMIT,AUDIO_LIMIT,baseMime,mediaExtension,validateMedia } from './media-validation'
export type { QuestionEvent } from './media-validation'
import type { QuestionEvent } from './media-validation'
export function stationSnapshot(format:unknown, stationId:unknown, questionIndex=0) {
 const station=INTERVIEW_STATIONS.find(s=>s.format===format && s.id===stationId)
 if (!station) throw new Error('Unknown interview station.')
 if(!Number.isInteger(questionIndex)||questionIndex<0||questionIndex>=station.questions.length)throw new Error('Unknown interview question.')
 const timing=getInterviewTiming(station.format)
 return {station_id:station.id,format:station.format,title:station.title,category:station.category,preparation:station.preparation,questions:station.format==='panel'?[station.questions[questionIndex]]:getInterviewQuestions(station),question_index:questionIndex,timing:{preparation_seconds:timing.preparationSeconds,response_seconds:timing.responseSeconds},snapshot_version:1}
}
export function validateDuration(value:unknown, format:'mmi'|'panel'):number {
 if(typeof value!=='number'|| !Number.isFinite(value)||value<=0||value>getInterviewTiming(format).responseSeconds+10) throw new Error('Recording duration is outside the allowed response time.')
 return Math.ceil(value)
}
export function validateQuestionEvents(value:unknown, count:number, duration:number):QuestionEvent[] {
 if(!Array.isArray(value)||!value.length||value.length>100) throw new Error('Invalid question timing.')
 let last=-1
 return value.map((event,i)=>{
 if(!event || typeof event!=='object'||!Number.isInteger(event.question_index)||event.question_index<0||event.question_index>=count||typeof event.offset_seconds!=='number'||!Number.isFinite(event.offset_seconds)||event.offset_seconds<last||event.offset_seconds<0||event.offset_seconds>duration||(i===0&&(event.question_index!==0||event.offset_seconds!==0))) throw new Error('Invalid question timing.')
 last=event.offset_seconds
 return {question_index:event.question_index,offset_seconds:event.offset_seconds}
 })
}
export function canSubmit(a:Pick<InterviewAttemptRow,'upload_status'|'marking_status'|'video_deleted_at'>) { return a.upload_status==='ready'&&a.marking_status===null&&!a.video_deleted_at }
export function statusLabel(a:Pick<InterviewAttemptRow,'marking_status'|'transcription_status'>) {
 if(!a.marking_status) return 'Saved for private self-review'
 return ({queued:a.transcription_status==='ready'?'Preparing tutor draft':'Preparing transcript',processing:a.transcription_status==='ready'?'Preparing tutor draft':'Preparing transcript',awaiting_review:'Awaiting human review',in_review:'Awaiting human review',released:'Feedback ready',needs_attention:'Needs attention — staff can review manually',ungradable:'Unable to mark — credit refunded'})[a.marking_status]
}
export function retryDelay(attempt:number, random=Math.random()) { return Math.round(Math.min(3600,30*2**Math.max(0,attempt-1))*(0.8+Math.max(0,Math.min(1,random))*0.2)) }
export function retentionDays(value:string|undefined) { const n=Number(value); return Number.isInteger(n)&&n>=1&&n<=3650?n:90 }
export function retentionEligible(a:Pick<InterviewAttemptRow,'media_kind'|'marking_status'|'released_at'|'created_at'|'video_deleted_at'|'upload_status'>,now:number,days=90) {
 if(a.video_deleted_at||a.media_kind!=='video'||a.upload_status!=='ready') return false
 if(a.marking_status && !['released','ungradable'].includes(a.marking_status)) return false
 const date=a.marking_status==='released'?a.released_at:a.created_at
 return !!date && Date.parse(date)<now-days*86400000
}
