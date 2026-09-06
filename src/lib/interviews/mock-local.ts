import type { LocalRecording } from './recording'
import type { QuestionEvent } from './video-validation'
import type { MockMode } from './mock-types'
import type { InterviewFormat } from './stations'
export type SegmentInfo={index:number;title:string;durationSeconds:number;saved:boolean}
export type MockDraft={id:string;userId:string;token:string;format:InterviewFormat;mode:MockMode;total:number;startedAt:number;ended:boolean;segments:SegmentInfo[]}
export type LocalSegment=LocalRecording & {key:string;sessionId:string;index:number;title:string;events:QuestionEvent[];shell?:{attemptId:string;videoPath:string;audioPath:string|null};videoUploaded?:boolean;audioUploaded?:boolean}
function open():Promise<IDBDatabase> {
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined'){reject(new Error('Local recording storage is unavailable. Try another browser.'));return}
  const request=indexedDB.open('studocyte-mock-recordings',1)
  request.onupgradeneeded=()=>{const db=request.result;db.createObjectStore('sessions',{keyPath:'id'});db.createObjectStore('segments',{keyPath:'key'})}
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('Local recording storage could not open.'))
 })
}
async function transaction<T>(stores:string[],mode:IDBTransactionMode,run:(tx:IDBTransaction,result:(value:T)=>void)=>void):Promise<T> {
 const db=await open()
 return new Promise((resolve,reject)=>{let value:T;const tx=db.transaction(stores,mode)
  tx.oncomplete=()=>{db.close();resolve(value)}
  tx.onabort=()=>{db.close();reject(new Error('Local recording storage is full or unavailable. Keep this tab open to save the last response.'))}
  tx.onerror=()=>{};try{run(tx,v=>{value=v})}catch(error){tx.abort();reject(error)}
 })
}
export async function readDraft(id:string,userId:string) {
 const draft=await transaction<MockDraft|undefined>(['sessions'],'readonly',(tx,result)=>{const r=tx.objectStore('sessions').get(id);r.onsuccess=()=>result(r.result)})
 return draft?.userId===userId?draft:undefined
}
export function listDrafts(userId:string) {
 return transaction<MockDraft[]>(['sessions'],'readonly',(tx,result)=>{const r=tx.objectStore('sessions').getAll();r.onsuccess=()=>result((r.result as MockDraft[]).filter(d=>d.userId===userId).sort((a,b)=>b.startedAt-a.startedAt))})
}
export function putDraft(draft:MockDraft) {return transaction<void>(['sessions'],'readwrite',tx=>{tx.objectStore('sessions').put(draft)})}
export function readSegment(id:string,index:number) {return transaction<LocalSegment|undefined>(['segments'],'readonly',(tx,result)=>{const r=tx.objectStore('segments').get(`${id}:${index}`);r.onsuccess=()=>result(r.result)})}
export function putSegment(segment:LocalSegment,draft:MockDraft) {return transaction<void>(['segments','sessions'],'readwrite',tx=>{tx.objectStore('segments').put(segment);tx.objectStore('sessions').put(draft)})}
export function markSegmentSaved(draft:MockDraft,index:number) {return transaction<void>(['segments','sessions'],'readwrite',tx=>{tx.objectStore('segments').delete(`${draft.id}:${index}`);tx.objectStore('sessions').put(draft)})}
export function deleteDraft(draft:MockDraft) {return transaction<void>(['segments','sessions'],'readwrite',tx=>{for(const item of draft.segments)tx.objectStore('segments').delete(`${draft.id}:${item.index}`);tx.objectStore('sessions').delete(draft.id)})}
