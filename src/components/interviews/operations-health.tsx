'use client'
import {useEffect,useState} from 'react'
import Link from 'next/link'
import {operationMessages as messages} from '@/lib/interviews/operation-messages'
type Health={checked_at:string;metrics:Record<string,number|string|boolean|null>;issues:string[];alerts_configured?:boolean;alert_delivery?:{pending:number;failed:number;last_sent_at:string|null};overdue_reviews?:{id:string;kind:'attempt'|'panel';title:string;status:string;submitted_at:string;recording_protected:boolean}[]}
export function InterviewOperationsHealth(){
 const [health,setHealth]=useState<Health|null>(null),[unavailable,setUnavailable]=useState(false),[stale,setStale]=useState(false)
 useEffect(()=>{const controller=new AbortController();let timer:ReturnType<typeof setTimeout>
 async function refresh(){try{if(document.visibilityState==='hidden')return;const response=await fetch('/api/admin/interviews/health',{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error();const next=await response.json() as Health;setHealth(next);setStale(Date.now()-Date.parse(next.checked_at)>10*60*1000);setUnavailable(false)}catch{if(!controller.signal.aborted)setUnavailable(true)}finally{if(!controller.signal.aborted)timer=setTimeout(refresh,60_000)}}
 void refresh();return()=>{controller.abort();clearTimeout(timer)}
 },[])
 const attention=unavailable||stale||!!health?.issues.length||!!health?.alert_delivery?.failed
 return <section aria-label="Queue and cleanup monitoring" className={`rounded-2xl border p-5 ${attention?'border-amber-400 bg-amber-50 text-slate-900':'border-border bg-surface'}`}>
 <h2 className="font-semibold">Queue &amp; cleanup · {attention?'Needs attention':health?'Healthy':'Checking…'}</h2>
 <p className="mt-2 text-sm">Checked every five minutes. This panel refreshes automatically while open.</p>
 {unavailable&&<p role="alert" className="mt-2">Monitoring could not load. Check the deployment and database configuration.</p>}
 {stale&&<p role="alert" className="mt-2">The health check is overdue. Check the monitoring scheduler.</p>}
 {health&&<><p className="mt-2 text-sm">{health.metrics.ready_jobs} jobs ready · {health.metrics.running_jobs} running · {health.metrics.cleanup_due} recordings awaiting deletion · {health.metrics.protected_overdue} kept for pending marking</p>
 <p className="mt-2 text-sm">Recording backups: {health.metrics.backup_enabled?`${health.metrics.backup_pending??0} waiting · ${health.metrics.backup_deletions??0} awaiting deletion`:"not enabled"}</p>
 {!!health.issues.length&&<ul className="mt-3 list-disc space-y-2 pl-5" role="alert">{health.issues.map(code=><li key={code}>{messages[code]??'An operation needs attention. Check the logs.'}</li>)}</ul>}
 <div className="mt-3 border-t border-current/15 pt-3 text-sm">
 <p>External alerts: {health.alerts_configured?'configured':'awaiting destination setup'} · {health.alert_delivery?.pending??0} pending · {health.alert_delivery?.failed??0} failed</p>
 {!!health.alert_delivery?.failed&&<p role="alert">Alert delivery exhausted its retries. Check the destination and delivery logs before retrying.</p>}
 {health.alert_delivery?.last_sent_at&&<p>Last delivered: {new Date(health.alert_delivery.last_sent_at).toLocaleString('en-AU')}</p>}
 </div>
 {!!health.overdue_reviews?.length&&<div className="mt-4 border-t border-current/15 pt-4"><h3 className="font-semibold">Overdue marking · {health.metrics.overdue_reviews}</h3><p className="mt-1 text-sm">Past the two-working-day turnaround, excluding weekends in Sydney time. Escalate to support; Elaine is the backup. Oldest first; up to 20 shown.</p>
 <ul className="mt-3 space-y-3">{health.overdue_reviews.map(review=><li key={`${review.kind}-${review.id}`} className="rounded-xl border border-current/15 p-3"><Link className="font-semibold underline underline-offset-4" href={review.kind==='panel'?`/admin/interviews/panels/${review.id}`:`/admin/interviews/${review.id}`}>{review.title} →</Link><p className="mt-1 text-sm">Submitted {new Date(review.submitted_at).toLocaleDateString('en-AU')} · {review.status.replaceAll('_',' ')}{review.recording_protected?' · Recording kept for marking':''}</p></li>)}</ul></div>}
 <p className="mt-3 text-xs">Last check: {new Date(health.checked_at).toLocaleString('en-AU')}</p></>}
 </section>
}
