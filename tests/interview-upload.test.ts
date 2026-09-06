import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { loadModule } from './helpers/load-module.mjs'
import { baseMime } from '../src/lib/interviews/media-validation'
const require=createRequire(import.meta.url)
// Use the actual tus browser transport, including XHR's append-on-repeat headers.
const requests:BrowserXHR[]=[]
let offset=0,tokenReads=0
class BrowserXHR {
 method='';url='';status=0;responseText='';headers:Record<string,string>={};responseHeaders:Record<string,string>={}
 upload:{onprogress?: (event:{lengthComputable:boolean;loaded:number})=>void}={}
 onload?:()=>void;onerror?:(e:Error)=>void
 open(method:string,url:string){this.method=method;this.url=url;requests.push(this)}
 setRequestHeader(name:string,value:string){const key=name.toLowerCase();this.headers[key]=this.headers[key]?`${this.headers[key]}, ${value}`:value}
 getResponseHeader(name:string){return this.responseHeaders[name.toLowerCase()]??null}
 send(blob?:Blob){
  if(this.headers.authorization?.includes(',')){this.status=400;this.responseText=JSON.stringify({statusCode:'403',message:'Invalid Compact JWS'})}
  else if(this.method==='POST'){offset=blob?.size??0;this.status=201;this.responseHeaders={location:'https://project.storage.supabase.co/storage/v1/upload/resumable/test','upload-offset':String(offset)}}
  else if(this.method==='PATCH'){offset+=blob?.size??0;this.status=204;this.responseHeaders={'upload-offset':String(offset)}}
  else if(this.method==='HEAD'){this.status=200;this.responseHeaders={'upload-offset':String(offset)}}
  queueMicrotask(()=>this.onload?.())
 }
 abort(){}
}
const values=new Map<string,string>()
const localStorage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,String(value)),removeItem:(key:string)=>values.delete(key),get length(){return values.size},key:(i:number)=>[...values.keys()][i]??null}
Object.assign(globalThis,{window:{localStorage,XMLHttpRequest:BrowserXHR,Blob},localStorage,XMLHttpRequest:BrowserXHR})
const browserTus=require('tus-js-client/lib.es5/browser/index.js')
const {uploadInterviewMedia,uploadErrorMessage}=loadModule('src/lib/interviews/video-upload.ts',{
 'tus-js-client':browserTus,
 '@/lib/supabase/client':{createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:`test-token-${++tokenReads}`}}})}})},
 './media-validation':{baseMime},
},{AbortController,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://project.supabase.co'}}}) as typeof import('../src/lib/interviews/video-upload')
test('browser upload sends one fresh Authorization value per POST/PATCH, including refreshed tokens',async()=>{
 requests.length=0;tokenReads=0;offset=0
 const video=new Blob([new Uint8Array(7*1024*1024)],{type:'video/webm;codecs=vp8,opus'})
 await uploadInterviewMedia(video,'student/attempt/response.webm',()=>{},new AbortController().signal)
 assert.deepEqual(requests.map(r=>r.method),['POST','PATCH'])
 assert.equal(offset,video.size)
 assert.equal(requests[0].headers.authorization,'Bearer test-token-2')
 assert.equal(requests[1].headers.authorization,'Bearer test-token-3')
 for(const request of requests)assert.ok(!request.headers.authorization.includes(','))
 assert.ok(requests[0].headers['upload-metadata'].includes('contentType dmlkZW8vd2VibQ=='))
})

test('upload failures explain authentication without exposing tokens or raw storage errors',()=>{
 const message=uploadErrorMessage({originalResponse:{getStatus:()=>400,getBody:()=>JSON.stringify({statusCode:'403',message:'private-token-do-not-display'})}})
 assert.match(message,/sign-in/);assert.ok(!message.includes('private-token'))
 assert.match(uploadErrorMessage(new Error('private-token')),/retry saving/)
})
