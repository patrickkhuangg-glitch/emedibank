'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {useRouter} from 'next/navigation'
import {STORY_THEMES,type InterviewStory,type StoryDraft} from '@/lib/interviews/stories'
const button='min-h-11 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
const secondary='min-h-11 rounded-full border border-border px-4 py-2.5 text-sm font-semibold hover:bg-surface-muted disabled:opacity-50'
const blank:StoryDraft={title:'',theme:'Teamwork',context:'',actions:'',reflection:''}
type Draft=StoryDraft&{id:string;version:number|null}
export function InterviewStoryBank({userId,initialStories}:{userId:string;initialStories:InterviewStory[]|null}){
 const router=useRouter(),revision=useRef(0)
 const [stories,setStories]=useState<InterviewStory[]>(initialStories??[]),[loading,setLoading]=useState(initialStories===null),[error,setError]=useState(''),[query,setQuery]=useState(''),[theme,setTheme]=useState(''),[page,setPage]=useState(1),[selected,setSelected]=useState<string|null>(null),[editor,setEditor]=useState<Draft|null>(null),[busy,setBusy]=useState(false),[deleting,setDeleting]=useState(false),[conflict,setConflict]=useState(false)
 const lock=useRef(false),draftKey=`studocyte:interview-story-draft:${userId}`
 const load=useCallback(async(signal?:AbortSignal)=>{const r=await fetch('/api/interviews/stories',{cache:'no-store',signal}),data=await r.json();if(!r.ok)throw new Error(data.error);return data.stories as InterviewStory[]},[])
 // Refresh the prefetched snapshot without hiding it. A response started before
 // an edit/delete must never overwrite the newer local mutation result.
 useEffect(()=>{
  let controller:AbortController|undefined
  function refresh(){
   if(document.visibilityState==='hidden'||lock.current)return
   controller?.abort();controller=new AbortController()
   const signal=controller.signal,current=++revision.current
   void load(signal).then(data=>{if(!signal.aborted&&current===revision.current)setStories(data)}).catch(e=>{if(!signal.aborted&&current===revision.current)setError(e instanceof Error?e.message:'Your stories could not load.')}).finally(()=>{if(!signal.aborted&&current===revision.current)setLoading(false)})
  }
  refresh();window.addEventListener('focus',refresh)
  return()=>{controller?.abort();window.removeEventListener('focus',refresh)}
 },[load])
 useEffect(()=>{
  try{const saved=JSON.parse(sessionStorage.getItem(draftKey)??'null');if(saved&&typeof saved.id==='string'&&['title','context','actions','reflection'].every(k=>typeof saved[k]==='string')&&STORY_THEMES.includes(saved.theme)&&(saved.version===null||Number.isInteger(saved.version)))void Promise.resolve().then(()=>setEditor(saved))}catch{}
 },[draftKey])
 function draft(value:Draft|null){setEditor(value);try{if(value)sessionStorage.setItem(draftKey,JSON.stringify(value));else sessionStorage.removeItem(draftKey)}catch{}}
 function create(){draft({...blank,id:crypto.randomUUID(),version:null});setSelected(null);setError('');setConflict(false)}
 async function save(){
  if(!editor||lock.current)return;lock.current=true;revision.current++;setLoading(false);setBusy(true);setError('');setConflict(false)
  try{const r=await fetch(editor.version===null?'/api/interviews/stories':`/api/interviews/stories/${editor.id}`,{method:editor.version===null?'POST':'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(editor)}),data=await r.json();if(!r.ok){setConflict(r.status===409);throw new Error(data.error)}const story=data.story as InterviewStory;setStories(previous=>[story,...previous.filter(s=>s.id!==story.id)]);draft(null);setSelected(story.id);setPage(1);router.refresh()}catch(e){setError(e instanceof Error?e.message:'Saving could not be confirmed. Your draft is kept here; retry safely.')}finally{lock.current=false;setBusy(false)}
 }
 const story=stories.find(s=>s.id===selected)
 async function remove(){
  if(!story||lock.current)return;lock.current=true;revision.current++;setLoading(false);setBusy(true);setError('')
  try{const r=await fetch(`/api/interviews/stories/${story.id}`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:story.version})}),data=await r.json();if(!r.ok)throw new Error(data.error);setStories(previous=>previous.filter(s=>s.id!==story.id));setSelected(null);setDeleting(false);router.refresh()}catch(e){setError(e instanceof Error?e.message:'Deletion could not be confirmed. Reload your stories to check.')}finally{lock.current=false;setBusy(false)}
 }
 const filtered=stories.filter(s=>(!theme||s.theme===theme)&&[s.title,s.context,s.actions,s.reflection].some(value=>value.toLowerCase().includes(query.trim().toLowerCase())))
 const pages=Math.max(1,Math.ceil(filtered.length/10)),currentPage=Math.min(page,pages),visible=filtered.slice((currentPage-1)*10,currentPage*10)
 return <main className="mx-auto max-w-[1240px] px-5 py-10 sm:px-8 sm:py-14">
  <header><h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Your story bank</h1><p className="mt-4 max-w-2xl text-base leading-7 text-muted">Build a bank of your own experiences and reflections. Save what happened, how you responded and what you learnt, ready for your next interview.</p></header>
  <section data-interview-tour="story-bank" className="mt-8">
   {error&&<div role="alert" className="mb-5 rounded-xl border border-border bg-surface p-4 text-sm leading-6"><p>{error}</p>{!editor&&<button className="mt-2 font-semibold text-brand underline" onClick={()=>{void load().then(data=>{setStories(data);setError('')}).catch(()=>setError('Your story bank could not load. Please try again.'))}}>Reload saved stories</button>}{conflict&&editor&&<button className="mt-2 font-semibold text-brand underline" onClick={()=>{draft({...editor,id:crypto.randomUUID(),version:null});setConflict(false);setError('Your draft is now a new story. Select Save story to keep both versions.')}}>Keep this draft as a new story</button>}</div>}
   {editor?<form onSubmit={e=>{e.preventDefault();void save()}} className="max-w-3xl rounded-2xl bg-surface p-5 sm:p-7">
    <h2 className="font-display text-2xl font-semibold">{editor.version===null?'Add a story':'Edit your story'}</h2><p className="mt-2 text-sm leading-6 text-muted">Only your account can access saved stories. An unfinished draft stays in this browser tab.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]"><label className="text-sm font-semibold">Story title<input autoFocus required maxLength={120} value={editor.title} onChange={e=>draft({...editor,title:e.target.value})} className="mt-2 block min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 font-normal focus:outline-brand" placeholder="A difficult team conversation"/></label><label className="text-sm font-semibold">Theme<select value={editor.theme} onChange={e=>draft({...editor,theme:e.target.value as StoryDraft['theme']})} className="mt-2 block min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 font-normal">{STORY_THEMES.map(t=><option key={t}>{t}</option>)}</select></label></div>
    {([['context','Context','What happened? What was your role?'],['actions','Your actions','What did you do, and why did you choose that approach?'],['reflection','Reflection','What did you learn? What would you do differently now?']] as const).map(([key,label,hint])=><label key={key} className="mt-5 block text-sm font-semibold">{label}<span className="mt-1 block font-normal text-muted">{hint}</span><textarea required maxLength={2000} rows={4} value={editor[key]} onChange={e=>draft({...editor,[key]:e.target.value})} className="mt-2 w-full rounded-xl border border-border bg-background p-3 font-normal leading-6 focus:outline-brand"/><span className="mt-1 block text-right text-xs font-normal text-muted">{editor[key].length}/2,000</span></label>)}
    <div className="mt-5 flex flex-wrap gap-3"><button disabled={busy} className={button}>{busy?'Saving…':'Save story'}</button><button type="button" disabled={busy} className={secondary} onClick={()=>{draft(null);setError('');setConflict(false)}}>Discard draft</button></div>
   </form>:story?<article className="max-w-3xl rounded-2xl bg-surface p-5 sm:p-7">
    <button className="min-h-11 text-sm font-semibold text-brand" onClick={()=>{setSelected(null);setDeleting(false);setError('')}}>← All stories</button><h2 className="mt-3 break-words font-display text-2xl font-semibold">{story.title}</h2><p className="mt-2 text-sm text-muted">{story.theme} · Updated {new Date(story.updated_at).toLocaleDateString('en-AU')}</p>
    {([['context','Context'],['actions','Your actions'],['reflection','Reflection']] as const).map(([key,label])=><section key={key} className="mt-6"><h3 className="font-semibold">{label}</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-muted">{story[key]}</p></section>)}
    <div className="mt-6 flex flex-wrap gap-3"><button className={button} onClick={()=>{draft({...story});setError('');setDeleting(false)}}>Edit story</button><button className={secondary} onClick={()=>setDeleting(true)}>Delete story</button></div>
    {deleting&&<div className="mt-5 border-t border-border pt-5"><p className="text-sm">Delete this story permanently?</p><div className="mt-3 flex gap-3"><button disabled={busy} className={secondary} onClick={remove}>Delete permanently</button><button disabled={busy} className={secondary} onClick={()=>setDeleting(false)}>Keep story</button></div></div>}
   </article>:<>
    <div className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-muted">{stories.length} saved {stories.length===1?'story':'stories'} · Private to your account</p><button className={button} onClick={create}>Add a story</button></div>
    {stories.length>0&&<div className="mt-5 flex flex-col gap-3 sm:flex-row"><label className="flex-1"><span className="sr-only">Search stories</span><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="Search your experiences and reflections" className="min-h-11 w-full rounded-full border border-border bg-surface px-4 py-2 text-sm"/></label><label><span className="sr-only">Story theme</span><select value={theme} onChange={e=>{setTheme(e.target.value);setPage(1)}} className="min-h-11 w-full rounded-full border border-border bg-surface px-4 py-2 text-sm"><option value="">All themes</option>{STORY_THEMES.map(t=><option key={t}>{t}</option>)}</select></label></div>}
    {loading?<p role="status" className="mt-6 text-sm text-muted">Loading your stories…</p>:stories.length===0?<div className="mt-6 rounded-2xl bg-surface p-6 sm:p-8"><h2 className="font-display text-2xl font-semibold">Start with one experience</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-muted">Think of a difficult team conversation, a time you helped someone, a mistake you learnt from, or a moment you changed your mind. The strongest examples explain your choices and what you took away.</p><p className="mt-4 text-sm font-semibold">Context → Your actions → Reflection</p></div>:visible.length===0?<p className="mt-6 text-sm text-muted">No stories match. Try another search or theme.</p>:<ul className="mt-5 divide-y divide-border overflow-hidden rounded-2xl bg-surface">{visible.map(s=><li key={s.id}><button onClick={()=>{setSelected(s.id);setError('');setDeleting(false)}} className="block w-full p-5 text-left hover:bg-surface-muted focus-visible:outline-brand"><span className="block break-words font-semibold">{s.title}</span><span className="mt-1 block text-xs text-muted">{s.theme}</span><span className="mt-2 line-clamp-2 break-words text-sm leading-6 text-muted">{s.reflection}</span></button></li>)}</ul>}
    {pages>1&&<nav aria-label="Story pages" className="mt-5 flex items-center justify-between gap-3"><button className={secondary} disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>Previous</button><p className="text-sm text-muted">{currentPage} of {pages}</p><button className={secondary} disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)}>Next</button></nav>}
   </>}
  </section>
 </main>
}
