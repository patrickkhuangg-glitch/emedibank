import { DOMAIN_LABELS,PART_A_DOMAINS,PART_B_DOMAINS,PANEL_DOMAINS,PERFORMANCE_BANDS } from './marking-rubric'
import type { InterviewFormat } from './stations'
export type Feedback={overall:{score:number;band:string;summary:string};domains:Array<{key:string;label:string;applicable:boolean;score:number|null;evidence:string[];comment:string}>;strengths:string[];priorities:string[];practice_task:string;reviewer_note:string}
export type Assessment={format:InterviewFormat;station_id:string;feedback:Feedback;observations:Array<{domain_key:string;question_index:number;offset_seconds:number|null;observation:string;confidence:'high'|'medium'|'low'}>;flags:string[]}
export type EvidenceAudit={warnings:Array<{category:string;domain_key:string|null;detail:string;question_index:number|null}>;requires_human_attention:boolean}
type Schema={type?:string;properties?:Record<string,Schema>;required?:string[];additionalProperties?:boolean;items?:Schema;enum?:readonly unknown[];anyOf?:Schema[];minimum?:number;maximum?:number;multipleOf?:number;minLength?:number;maxLength?:number;minItems?:number;maxItems?:number}
const text:Schema={type:'string',minLength:1,maxLength:3000},score:Schema={type:'number',minimum:1,maximum:7,multipleOf:.5}
const strings=(min=0):Schema=>({type:'array',items:text,minItems:min,maxItems:12})
const object=(properties:Record<string,Schema>):Schema=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false})
const nullable=(s:Schema):Schema=>({anyOf:[s,{type:'null'}]})
const domainKey:Schema={type:'string',enum:Object.keys(DOMAIN_LABELS)}
export const FEEDBACK_SCHEMA=object({
 overall:object({score,band:{type:'string',enum:PERFORMANCE_BANDS},summary:text}),
 domains:{type:'array',minItems:1,maxItems:20,items:object({key:domainKey,label:text,applicable:{type:'boolean'},score:nullable(score),evidence:strings(),comment:text})},
 strengths:strings(1),priorities:strings(1),practice_task:text,reviewer_note:{type:'string',enum:['Reviewed and approved by an EMeducate reviewer.']},
})
export const ASSESSMENT_SCHEMA=object({format:{type:'string',enum:['mmi','panel']},station_id:text,feedback:FEEDBACK_SCHEMA,
 observations:{type:'array',minItems:1,maxItems:50,items:object({domain_key:domainKey,question_index:{type:'integer',minimum:0,maximum:20},offset_seconds:nullable({type:'number',minimum:0,maximum:490}),observation:text,confidence:{type:'string',enum:['high','medium','low']}})},flags:strings()})
export const AUDIT_SCHEMA=object({warnings:{type:'array',maxItems:30,items:object({category:{type:'string',enum:['unsupported_evidence','score_mismatch','contradiction','not_applicable','transcript_quality','unsafe_unfair','human_attention']},domain_key:nullable(domainKey),detail:text,question_index:nullable({type:'integer',minimum:0,maximum:20})})},requires_human_attention:{type:'boolean'}})
export function validateSchema(value:unknown,s:Schema):boolean {
 if(s.anyOf)return s.anyOf.some(candidate=>validateSchema(value,candidate))
 if(s.enum&&!s.enum.includes(value))return false
 if(s.type==='null')return value===null
 if(s.type==='string')return typeof value==='string'&&value.trim().length>=(s.minLength??0)&&value.length<=(s.maxLength??Infinity)
 if(s.type==='boolean')return typeof value==='boolean'
 if(s.type==='integer'||s.type==='number')return typeof value==='number'&&Number.isFinite(value)&&(s.type!=='integer'||Number.isInteger(value))&&value>=(s.minimum??-Infinity)&&value<=(s.maximum??Infinity)&&(!s.multipleOf||Number.isInteger(value/s.multipleOf))
 if(s.type==='array')return Array.isArray(value)&&value.length>=(s.minItems??0)&&value.length<=(s.maxItems??Infinity)&&value.every(v=>validateSchema(v,s.items!))
 if(s.type==='object'){
 if(!value||typeof value!=='object'||Array.isArray(value))return false
 const v=value as Record<string,unknown>
 return (s.required??[]).every(k=>k in v)&&Object.entries(v).every(([k,item])=>s.properties?.[k]?validateSchema(item,s.properties[k]):s.additionalProperties!==false)
 }
 return false
}
export function validateFeedback(value:unknown,format?:InterviewFormat):Feedback {
 if(!validateSchema(value,FEEDBACK_SCHEMA))throw new Error('invalid_feedback')
 const feedback=value as Feedback
 const allowed=format==='panel'?PANEL_DOMAINS:{...PART_A_DOMAINS,...PART_B_DOMAINS}
 const seen=new Set<string>()
 for(const d of feedback.domains){
 if(seen.has(d.key)||(format&&!(d.key in allowed))||(d.applicable?(d.score===null||!d.evidence.length):(d.score!==null)))throw new Error('invalid_feedback')
 seen.add(d.key)
 }
 if(!feedback.domains.some(d=>d.applicable))throw new Error('insufficient_evidence')
 // Pick only public fields, even after validation, as the publication boundary.
 return {overall:{...feedback.overall},domains:feedback.domains.map(d=>({...d})),strengths:[...feedback.strengths],priorities:[...feedback.priorities],practice_task:feedback.practice_task,reviewer_note:'Reviewed and approved by an EMeducate reviewer.'}
}
export function validateAssessment(value:unknown,format:InterviewFormat,stationId:string,questionCount:number,duration:number):Assessment {
 if(!validateSchema(value,ASSESSMENT_SCHEMA))throw new Error('invalid_assessment')
 const a=value as Assessment
 if(a.format!==format||a.station_id!==stationId)throw new Error('invalid_station')
 validateFeedback(a.feedback,format)
 for(const o of a.observations)if(o.question_index>=questionCount||(o.offset_seconds!==null&&o.offset_seconds>duration)||!a.feedback.domains.some(d=>d.key===o.domain_key&&d.applicable))throw new Error('invalid_evidence')
 for(const d of a.feedback.domains)if(d.applicable&&!a.observations.some(o=>o.domain_key===d.key))throw new Error('missing_evidence')
 return a
}
export function validateAudit(value:unknown,questionCount:number):EvidenceAudit {
 if(!validateSchema(value,AUDIT_SCHEMA))throw new Error('invalid_audit')
 const audit=value as EvidenceAudit
 if(audit.warnings.some(w=>w.question_index!==null&&w.question_index>=questionCount))throw new Error('invalid_audit')
 return audit
}
export function manualFeedback(format:InterviewFormat):Feedback {
 const domains=format==='panel'?PANEL_DOMAINS:PART_A_DOMAINS
 return {overall:{score:4,band:'Developing response',summary:''},domains:Object.entries(domains).map(([key,d])=>({key,label:d.name,applicable:false,score:null,evidence:[],comment:''})),strengths:[''],priorities:[''],practice_task:'',reviewer_note:'Reviewed and approved by an EMeducate reviewer.'}
}

// Drafts may be incomplete, but keep the same bounded public shape. Release remains strict.
export function validateDraftFeedback(value:unknown):Feedback {
 function relaxed(s:Schema):Schema { return {...s,minLength:s.type==='string'?0:s.minLength,minItems:s.type==='array'?0:s.minItems,properties:s.properties?Object.fromEntries(Object.entries(s.properties).map(([k,v])=>[k,relaxed(v)])):undefined,items:s.items?relaxed(s.items):undefined,anyOf:s.anyOf?.map(relaxed)} }
 if(!validateSchema(value,relaxed(FEEDBACK_SCHEMA)))throw new Error('invalid_draft')
 return value as Feedback
}
