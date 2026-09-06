export const MARKING_DESCRIPTION='Use Interview marking credits for an EMeducate reviewer to assess your responses and provide a comprehensive report on your strengths, weaknesses and how to improve.'
export type MockMembership={id:string;mode:'full';index:number;total:number}
export function mockMembership(snapshot:unknown,format:'mmi'|'panel'):MockMembership|null {
 if(!snapshot||typeof snapshot!=='object')return null
 const value=(snapshot as {mock_session?:unknown}).mock_session
 if(!value||typeof value!=='object')return null
 const m=value as MockMembership,total=format==='mmi'?8:10
 if(m.mode!=='full'||typeof m.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m.id)||m.total!==total||!Number.isInteger(m.index)||m.index<0||m.index>=total)return null
 return {id:m.id,mode:'full',index:m.index,total}
}
export function completeMock<T extends {format:'mmi'|'panel';station_snapshot:unknown}>(attempts:T[],id:string) {
 if(!attempts.length)return false
 const format=attempts[0].format,total=format==='mmi'?8:10
 const members=attempts.map(a=>mockMembership(a.station_snapshot,a.format))
 return attempts.length===total&&attempts.every(a=>a.format===format)&&members.every(m=>m?.id===id)&&new Set(members.map(m=>m?.index)).size===total
}
export type MockMarkingSummary={sessionId:string;createdAt:string;format:'mmi'|'panel';total:number;saved:number;remaining:number;cost:number;credits:number;ready:boolean;submitted:boolean}

export const FULL_MOCK_CREDITS=12
export function stationMarkingCredits(format:'mmi'|'panel'){return format==='mmi'?2:1}
export function fullMockMarkingCredits(attempts:{credits_spent?:number;marking_status:unknown}[]){
 return attempts.every(a=>a.marking_status!==null)?0:Math.max(0,FULL_MOCK_CREDITS-attempts.reduce((sum,a)=>sum+(a.credits_spent??0),0))
}
