import type { MockMembership } from './mock-marking'
export type ReviewStatus='saved'|'pending'|'feedback'|'unavailable'
export type ReviewResponse={id:string;format:'mmi'|'panel';title:string;createdAt:string;duration:number;mock:MockMembership|null;status:ReviewStatus;eligible:boolean}
export type ReviewEntry={id:string;title:string;format:'mmi'|'panel';createdAt:string;responses:ReviewResponse[];full:boolean}
export const REVIEW_PAGE_SIZE=10
export function reviewLibrary(responses:ReviewResponse[],query:{q?:string;format?:string;status?:string;page?:string}){
 const groups=new Map<string,ReviewEntry>()
 for(const response of responses){
  const key=response.mock?.id??response.id
  const entry=groups.get(key)??{id:key,title:response.mock?(response.format==='mmi'?'Full MMI · 8 stations':'Full panel · 30 minutes'):response.title,format:response.format,createdAt:response.createdAt,responses:[],full:!!response.mock}
  entry.responses.push(response);if(response.createdAt>entry.createdAt)entry.createdAt=response.createdAt;groups.set(key,entry)
 }
 const all=[...groups.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id))
 for(const entry of all)entry.responses.sort((a,b)=>(a.mock?.index??0)-(b.mock?.index??0))
 const search=(query.q??'').trim().toLowerCase()
 const filtered=all.filter(e=>(!query.format||e.format===query.format)&&(!query.status||e.responses.some(r=>r.status===query.status))&&(!search||[e.title,...e.responses.map(r=>r.title)].some(t=>t.toLowerCase().includes(search))))
 const pages=Math.max(1,Math.ceil(filtered.length/REVIEW_PAGE_SIZE)),page=Math.min(pages,Math.max(1,Math.floor(Number(query.page)||1)))
 return {all,items:filtered.slice((page-1)*REVIEW_PAGE_SIZE,page*REVIEW_PAGE_SIZE),count:filtered.length,page,pages}
}
export function reviewHref(query:Record<string,string|undefined>,changes:Record<string,string|undefined>={}){
 const params=new URLSearchParams()
 for(const [key,value] of Object.entries({...query,...changes}))if(value)params.set(key,value)
 return `/interviews/mock-interviews/review${params.size?'?'+params:''}`
}
