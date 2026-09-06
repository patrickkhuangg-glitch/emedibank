import 'server-only'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { makeMockSteps } from './mock-plan'
import type { MockSelection, MockTicket } from './mock-types'
function key() { const value=process.env.INTERVIEW_WORKER_SECRET; if(!value || value.length<32) throw new Error('Timed mock sessions are not configured.'); return value }
function signature(value:string) { return createHmac('sha256',key()).update(`mock-session-v1:${value}`).digest() }
export function startMockSession(userId:string, selection:MockSelection, now=Date.now()) {
 const steps=makeMockSteps(selection)
 const ticket:MockTicket={version:1,id:randomUUID(),userId,startedAt:now,format:selection.format,mode:selection.mode,steps}
 const encoded=Buffer.from(JSON.stringify(ticket)).toString('base64url')
 return {ticket,token:`${encoded}.${signature(encoded).toString('base64url')}`}
}
export function readMockSession(token:unknown,userId:string,now=Date.now()):MockTicket {
 if(typeof token!=='string'||token.length>12000)throw new Error('Invalid mock session.')
 const [body,mac,...extra]=token.split('.');if(!body||!mac||extra.length)throw new Error('Invalid mock session.')
 const provided=Buffer.from(mac,'base64url'),expected=signature(body)
 if(provided.length!==expected.length||!timingSafeEqual(provided,expected))throw new Error('Invalid mock session.')
 const ticket=JSON.parse(Buffer.from(body,'base64url').toString()) as MockTicket
 if(ticket.version!==1||ticket.userId!==userId||!Array.isArray(ticket.steps)||!ticket.steps.length||ticket.startedAt>now+1000||now-ticket.startedAt>7*86400000)throw new Error('Mock session expired. Start a new timed session.')
 return ticket
}
export function mockAttemptId(ticket:MockTicket,index:number) {
 const bytes=signature(`${ticket.id}:${ticket.userId}:${index}`).subarray(0,16);bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128
 const hex=bytes.toString('hex');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
}
