'use client'
import { useRef,useState } from 'react'
import type { QuestionEvent } from '@/lib/interviews/video-validation'
export function InterviewMediaPlayer({url,kind,events,attemptId}:{url:string|null;kind:'audio'|'video';events:QuestionEvent[];attemptId?:string}){
 const player=useRef<HTMLVideoElement&HTMLAudioElement>(null),[source,setSource]=useState(url),[message,setMessage]=useState('')
 async function refresh(){if(!attemptId){setMessage('Refresh this page to renew playback.');return}try{const r=await fetch(`/api/interviews/attempts/${attemptId}/media`);const data=await r.json();if(!r.ok)throw 0;setSource(data.url);setMessage('Playback renewed.')}catch{setMessage('The recording is unavailable or has expired.')}}
 return <section className="my-5 space-y-3" aria-label="Private recording">
 {source?(kind==='video'?<video ref={player} src={source} controls playsInline preload="metadata" className="max-h-[65vh] w-full rounded-2xl bg-black" onError={()=>setMessage('Playback expired or unavailable. Renew playback to try again.')}/>:<audio ref={player} src={source} controls preload="metadata" className="w-full" onError={()=>setMessage('Playback expired or unavailable. Renew playback to try again.')}/>):<p>The recording is unavailable.</p>}
 <div className="flex flex-wrap items-center gap-3"><label className="text-sm">Playback speed <select defaultValue="1" className="rounded-full border border-border px-3 py-2" onChange={e=>{if(player.current)player.current.playbackRate=Number(e.target.value)}}>{[.75,1,1.25,1.5,2].map(n=><option key={n} value={n}>{n}×</option>)}</select></label>{attemptId&&<button className="rounded-full border border-border px-4 py-2 text-sm" onClick={refresh}>Renew playback</button>}</div>
 <div className="flex flex-wrap gap-2">{events.map((e,i)=><button key={i} className="min-h-11 rounded-full border border-border px-4 py-2 text-sm" onClick={()=>{if(player.current)player.current.currentTime=e.offset_seconds}}>Question {e.question_index+1} · {Math.floor(e.offset_seconds/60)}:{String(Math.floor(e.offset_seconds%60)).padStart(2,'0')}</button>)}</div>
 {message&&<p role="status" className="text-sm text-muted">{message}</p>}
 </section>
}
