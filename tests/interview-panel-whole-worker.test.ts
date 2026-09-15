import {test} from 'node:test'
import assert from 'node:assert/strict'
import {loadModule} from './helpers/load-module.mjs'
import {panelFixture,panelMembers,panelOwner,panelSession} from './helpers/panel-fixture'
import {wholePanelSource} from '../src/lib/interviews/panel-source'
import {validateWholePanelFeedback,validatePanelAudit} from '../src/lib/interviews/panel-feedback'
import {ProviderError} from '../src/lib/interviews/provider-error'
test('whole-panel worker loads all members once, checks storage, persists assessment and audit, and fences failures',async()=>{
 let members=panelMembers().map(m=>({...m,recording_path:`${m.id}/video.webm`})),stage='assess',failure='',providerCalls=0,loads=0,completed:unknown,failed:unknown
 let a=panelFixture();const marking={id:'mark',user_id:panelOwner,mock_session_id:panelSession,status:'queued',source_fingerprint:'hash',assessment:a}
 const db={rpc:async(name:string,args:unknown)=>{if(name==='claim_next_panel_job')return {data:[{id:'job',marking_id:'mark',job_type:stage,attempt_count:1}],error:null};if(name==='panel_source_fingerprint')return {data:failure==='changed'?'newhash':'hash',error:null};if(name==='complete_panel_job'){completed=args;return {data:true,error:failure==='persistence'?{message:'failed'}:null}}if(name==='fail_panel_job'){failed=args;return {data:true,error:null}}throw Error(name)},from(table:string){const chain={select:()=>chain,eq:()=>chain,in:()=>chain,single:async()=>({data:marking,error:null}),then(resolve:(r:unknown)=>void){if(table==='interview_attempts')loads++;return Promise.resolve({data:table==='interview_mock_marking_members'?members.map((m,i)=>({attempt_id:m.id,sequence_index:i})):members,error:null}).then(resolve)}};return chain},storage:{from:()=>({info:async()=>({data:failure==='media'?null:{size:1000},error:failure==='media'?{message:'missing'}:null})})}}
 const worker=loadModule('src/lib/interviews/panel-jobs.ts',{'./trial-provider':{admitTrialProvider:async()=>{}},'@/lib/supabase/admin':{createAdminClient:()=>db},'./panel-source':{wholePanelSource},'./panel-feedback':{validateWholePanelFeedback,validatePanelAudit},'./config':{wholePanelMarkingEnabled:()=>true},'./video-validation':{retryDelay:()=>10},'./provider':{ProviderError,structuredInterviewRequest:async(mode:string,step:string,source:unknown)=>{providerCalls++;assert.equal(mode,'panel_complete');assert.deepEqual(source,a.source);if(failure==='provider')throw new ProviderError('provider_http_429');return {value:step==='assess'?a:{warnings:[],requires_human_attention:false},model:'synthetic'}}}}) as {processPanelJob:(job:unknown,worker:string)=>Promise<unknown>}
 await worker.processPanelJob({id:'job',marking_id:'mark',job_type:stage,attempt_count:1},'worker');assert.equal(loads,1);assert.equal(providerCalls,1);assert.ok(JSON.stringify(completed).includes('assessment'));assert.equal(failed,undefined)
 stage='audit';await worker.processPanelJob({id:'job',marking_id:'mark',job_type:stage,attempt_count:1},'worker');assert.equal(providerCalls,2);assert.ok(JSON.stringify(completed).includes('audit'))
 for(const issue of ['media','changed','provider','persistence']){failure=issue;failed=undefined;completed=undefined;const before:number=providerCalls;await worker.processPanelJob({id:'job',marking_id:'mark',job_type:stage,attempt_count:1},'worker');assert.ok(failed,issue);if(['media','changed'].includes(issue))assert.equal(providerCalls,before)}
 failure='';members=members.slice(1);const before:number=providerCalls;await worker.processPanelJob({id:'job',marking_id:'mark',job_type:stage,attempt_count:1},'worker');assert.equal(providerCalls,before);assert.match(JSON.stringify(failed),/invalid_panel_membership/)
 members=panelMembers().slice(0,6).map(m=>({...m,recording_path:`${m.id}/video.webm`}))
 a=panelFixture(members);a.feedback.global_rating={score:null,band:null,basis:'Only six responses are available.'};marking.assessment=a
 failed=undefined;completed=undefined;stage='assess'
 await worker.processPanelJob({id:'job',marking_id:'mark',job_type:stage,attempt_count:1},'worker')
 assert.equal(failed,undefined);assert.ok(JSON.stringify(completed).includes('excerpt'))
 stage='audit';await worker.processPanelJob({id:'job',marking_id:'mark',job_type:stage,attempt_count:1},'worker')
 assert.equal(failed,undefined);assert.ok(JSON.stringify(completed).includes('audit'))
 members=members.slice(0,1);failed=undefined;completed=undefined;const singleBefore=providerCalls
 await worker.processPanelJob({id:'job',marking_id:'mark',job_type:'assess',attempt_count:1},'worker')
 assert.equal(providerCalls,singleBefore);assert.equal(completed,undefined);assert.match(JSON.stringify(failed),/invalid_panel_membership/)


})
