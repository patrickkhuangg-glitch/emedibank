import {validateSchema} from './marking-validation'
import {PANEL_RUBRIC_VERSION,PANEL_FEEDBACK_VERSION,PANEL_BANDS,WHOLE_PANEL_DOMAINS,type PanelDomainKey} from './panel-rubric'
import type {PanelSource} from './panel-source'
export type PanelPlan={basis:'supplied'|'provisional';purpose:string;primary_domains:PanelDomainKey[];tasks:Array<{sequence:string;primary:boolean;domains:PanelDomainKey[];essential:string;optional:string}>;limitation:string}
export type WholePanelFeedback={rubric_version:typeof PANEL_RUBRIC_VERSION;feedback_version:typeof PANEL_FEEDBACK_VERSION;evidence_scope:{completeness:PanelSource['completeness'];media_inspected:'transcript';limitation:string};question_coverage:Array<{sequence:string;topic:string;coverage:'addressed'|'partly_addressed'|'not_addressed'|'not_assessable';observation:string}>;domains:Array<{key:PanelDomainKey;label:string;state:'scored'|'not_elicited'|'insufficient_evidence';score:number|null;evidence:string[];why:string;improvement:string}>;global_rating:{score:number|null;band:typeof PANEL_BANDS[number]|null;basis:string};strengths:string[];priorities:string[];closing_paragraph:string;concerns:Array<{level:'clarification_needed'|'observed_concern'|'serious_observed_concern';detail:string;sequence:string}>;reviewer_note:'Reviewed and approved by an EMeducate reviewer.'}
export type PanelAudit={warnings:Array<{category:'evidence'|'coverage'|'scoring'|'attribution'|'fairness'|'writing';detail:string;references:string[]}>;requires_human_attention:boolean}
export type PanelAssessment={mode:'panel_complete';source:PanelSource;plan:PanelPlan;feedback:WholePanelFeedback}
const text=(max=2000,min=1)=>({type:'string',minLength:min,maxLength:max}),en=(values:readonly unknown[])=>({type:'string',enum:values}),list=(items:unknown,max=30,min=0)=>({type:'array',items,maxItems:max,minItems:min}),obj=(properties:Record<string,unknown>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false}),nullable=(schema:unknown)=>({anyOf:[schema,{type:'null'}]})
const domain=en(Object.keys(WHOLE_PANEL_DOMAINS)),score=nullable({type:'integer',minimum:1,maximum:7}),strings=list(text(),5)
export const PANEL_PLAN_SCHEMA=obj({basis:en(['supplied','provisional']),purpose:text(),primary_domains:list(domain,12,1),tasks:list(obj({sequence:text(100),primary:{type:'boolean'},domains:list(domain,12,1),essential:text(),optional:text(2000,0)}),30,1),limitation:text(2000,0)})
export const WHOLE_PANEL_SCHEMA=obj({rubric_version:en([PANEL_RUBRIC_VERSION]),feedback_version:en([PANEL_FEEDBACK_VERSION]),evidence_scope:obj({completeness:en(['complete','excerpt','unknown']),media_inspected:en(['transcript']),limitation:text()}),question_coverage:list(obj({sequence:text(100),topic:text(300),coverage:en(['addressed','partly_addressed','not_addressed','not_assessable']),observation:text()}),30,1),domains:list(obj({key:domain,label:text(150),state:en(['scored','not_elicited','insufficient_evidence']),score,evidence:list(text(100),20),why:text(),improvement:text(2000,0)}),12,12),global_rating:obj({score,band:nullable(en(PANEL_BANDS)),basis:text()}),strengths:strings,priorities:strings,closing_paragraph:text(2000),concerns:list(obj({level:en(['clarification_needed','observed_concern','serious_observed_concern']),detail:text(),sequence:text(100)}),12),reviewer_note:en(['Reviewed and approved by an EMeducate reviewer.'])})
export const PANEL_AUDIT_SCHEMA=obj({warnings:list(obj({category:en(['evidence','coverage','scoring','attribution','fairness','writing']),detail:text(),references:list(text(100),20)}),30),requires_human_attention:{type:'boolean'}})
export function validatePanelPlan(value:unknown,source:PanelSource):PanelPlan{
 if(!validateSchema(value,PANEL_PLAN_SCHEMA))throw new Error('invalid_panel_plan')
 const plan=value as PanelPlan,ids=new Set(source.sequences.map(s=>s.id))
 if(plan.tasks.length!==ids.size||new Set(plan.tasks.map(t=>t.sequence)).size!==ids.size||plan.tasks.some(t=>!ids.has(t.sequence))||new Set(plan.primary_domains).size!==plan.primary_domains.length||!plan.tasks.some(t=>t.primary)||plan.primary_domains.some(d=>!plan.tasks.some(t=>t.primary&&t.domains.includes(d))))throw new Error('invalid_panel_plan')
 return plan
}
export function validateWholePanelFeedback(value:unknown,source:PanelSource,plan:PanelPlan,{draft=false}:{draft?:boolean}={}):WholePanelFeedback{
 // Drafts relax text only; IDs, states, ranges and private/public boundaries stay strict.
 const schema=draft?JSON.parse(JSON.stringify(WHOLE_PANEL_SCHEMA),(_k,v)=>v&&typeof v==='object'&&v.type==='string'?{...v,minLength:0}:v):WHOLE_PANEL_SCHEMA
 if(!validateSchema(value,schema))throw new Error('invalid_whole_panel_feedback')
 const f=value as WholePanelFeedback,ids=new Set(source.sequences.map(s=>s.id)),refs=new Map(source.sequences.flatMap(s=>s.references.map(r=>[r.id,r] as const)))
 validatePanelPlan(plan,source)
 if(f.evidence_scope.completeness!==source.completeness||f.question_coverage.length!==ids.size||new Set(f.question_coverage.map(q=>q.sequence)).size!==ids.size||f.question_coverage.some(q=>!ids.has(q.sequence))||new Set(f.domains.map(d=>d.key)).size!==12)throw new Error('invalid_panel_coverage')
 for(const d of f.domains){
  const elicited=plan.tasks.some(t=>t.domains.includes(d.key))
  if(d.label!==WHOLE_PANEL_DOMAINS[d.key].label||d.evidence.some(id=>!refs.has(id))||!elicited&&d.state!=='not_elicited'||elicited&&d.state==='not_elicited'||d.state!=='scored'&&d.score!==null||d.state==='scored'&&(d.score===null||!d.evidence.length||!d.evidence.some(id=>refs.get(id)?.speaker==='candidate')))throw new Error('invalid_panel_domain_evidence')
  if(!draft&&d.state==='scored'&&!d.improvement.trim())throw new Error('missing_panel_improvement')
 }
 if(f.global_rating.score===null?f.global_rating.band!==null:f.global_rating.band!==PANEL_BANDS[f.global_rating.score-1])throw new Error('invalid_panel_global_band')
 const unavailable=plan.tasks.filter(t=>t.primary).some(t=>source.sequences.find(s=>s.id===t.sequence)?.availability!=='available'||f.question_coverage.find(q=>q.sequence===t.sequence)?.coverage==='not_assessable')||plan.primary_domains.some(k=>f.domains.find(d=>d.key===k)?.state!=='scored')
 if(f.global_rating.score!==null&&(unavailable||source.completeness==='excerpt'))throw new Error('insufficient_panel_global_evidence')
 for(const q of f.question_coverage){const seq=source.sequences.find(s=>s.id===q.sequence)!;if(seq.availability!=='available'&&q.coverage!=='not_assessable'||seq.response_disposition==='not_answered'&&q.coverage!=='not_addressed'||seq.response_disposition==='insubstantial'&&q.coverage!=='partly_addressed')throw new Error('invalid_panel_missing_response')}
 if(f.concerns.some(c=>!ids.has(c.sequence)))throw new Error('invalid_panel_concern_reference')
 if(!draft&&(f.closing_paragraph.includes('\n')||f.concerns.some(c=>!f.closing_paragraph.includes(c.sequence))))throw new Error('invalid_panel_closing')
 return structuredClone(f)
}
export function validatePanelAudit(value:unknown,source:PanelSource):PanelAudit{
 if(!validateSchema(value,PANEL_AUDIT_SCHEMA))throw new Error('invalid_panel_audit')
 const a=value as PanelAudit,ids=new Set(source.sequences.flatMap(s=>[s.id,...s.references.map(r=>r.id)]))
 if(a.warnings.some(w=>w.references.some(r=>!ids.has(r)))||a.warnings.length&&!a.requires_human_attention)throw new Error('invalid_panel_audit')
 return a
}
export function blankWholePanelFeedback(source:PanelSource,plan:PanelPlan):WholePanelFeedback{
 return {rubric_version:PANEL_RUBRIC_VERSION,feedback_version:PANEL_FEEDBACK_VERSION,evidence_scope:{completeness:source.completeness,media_inspected:'transcript',limitation:source.limitation},question_coverage:source.sequences.map(s=>({sequence:s.id,topic:s.title,coverage:s.response_disposition==='not_answered'?'not_addressed':s.response_disposition==='insubstantial'?'partly_addressed':'not_assessable',observation:''})),domains:Object.entries(WHOLE_PANEL_DOMAINS).map(([key,d])=>({key:key as PanelDomainKey,label:d.label,state:plan.tasks.some(t=>t.domains.includes(key as PanelDomainKey))?'insufficient_evidence':'not_elicited',score:null,evidence:[],why:'',improvement:''})),global_rating:{score:null,band:null,basis:''},strengths:[],priorities:[],closing_paragraph:'',concerns:[],reviewer_note:'Reviewed and approved by an EMeducate reviewer.'}
}
