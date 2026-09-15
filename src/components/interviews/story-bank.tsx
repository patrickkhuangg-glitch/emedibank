'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {useRouter} from 'next/navigation'
import {STORY_THEMES,isStoryAnswered,type InterviewStory,type StoryDraft} from '@/lib/interviews/stories'
import {findStoryPrompt,storyPromptCategory,type StoryPrompt} from '@/lib/interviews/story-prompts'
import {StoryPromptLibrary,StoryStatus} from './story-prompt-library'
import {InterviewCytoCoach} from './cyto-coach'
const button='eb-press min-h-11 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
const secondary='eb-press min-h-11 rounded-full border border-border px-4 py-2.5 text-sm font-semibold hover:bg-surface-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand'
const blank:StoryDraft={title:'',theme:'Teamwork',context:'',actions:'',reflection:'',prompt_id:null}
type Draft=StoryDraft&{id:string;version:number|null}
const sections=[['context','Context','What happened? What was your role?'],['actions','Your actions','What did you do, and why did you choose that approach?'],['reflection','Reflection','What did you learn? What would you do differently now?']] as const
export function InterviewStoryBank({userId,initialStories,readOnly=false}:{userId:string;initialStories:InterviewStory[]|null;readOnly?:boolean}){
 const router=useRouter(),revision=useRef(0),lock=useRef(false),returnFocus=useRef<HTMLElement|null>(null),scroll=useRef(0),heading=useRef<HTMLHeadingElement>(null)
 const [stories,setStories]=useState<InterviewStory[]>(initialStories??[]),[loading,setLoading]=useState(initialStories===null),[error,setError]=useState(''),[selected,setSelected]=useState<string|null>(null),[editor,setEditor]=useState<Draft|null>(null),[view,setView]=useState<'library'|'editor'|'story'>('library'),[busy,setBusy]=useState(false),[deleting,setDeleting]=useState(false),[conflict,setConflict]=useState(false),[message,setMessage]=useState('')
 const draftKey=`studocyte:interview-story-draft:${userId}`
 const load=useCallback(async(signal?:AbortSignal)=>{const r=await fetch('/api/interviews/stories',{cache:'no-store',signal}),data=await r.json();if(!r.ok)throw new Error(data.error);return data.stories as InterviewStory[]},[])
 const refresh=useCallback(async(signal?:AbortSignal)=>{
  if(lock.current)return
  const current=++revision.current
  try{const data=await load(signal);if(!signal?.aborted&&current===revision.current){setStories(data);setError('')}}catch(e){if(!signal?.aborted&&current===revision.current)setError(e instanceof Error?e.message:'Your stories could not load.')}finally{if(!signal?.aborted&&current===revision.current)setLoading(false)}
 },[load])
 useEffect(()=>{let controller:AbortController|undefined
  function run(){if(document.visibilityState==='hidden'||lock.current)return;controller?.abort();controller=new AbortController();void refresh(controller.signal)}
  run();window.addEventListener('focus',run);return()=>{controller?.abort();window.removeEventListener('focus',run)}
 },[refresh])
 useEffect(()=>{
  try{const saved=JSON.parse(sessionStorage.getItem(draftKey)??'null');if(saved&&typeof saved.id==='string'&&['title','context','actions','reflection'].every(k=>typeof saved[k]==='string')&&STORY_THEMES.includes(saved.theme)&&(saved.version===null||Number.isInteger(saved.version)))void Promise.resolve().then(()=>{setEditor(saved);setMessage('Your unfinished response is ready to continue.')})}catch{}
 },[draftKey])
 useEffect(()=>{if(view!=='library'){heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start',behavior:'instant'})}},[view,selected])
 function draft(value:Draft|null){setEditor(value);try{if(value)sessionStorage.setItem(draftKey,JSON.stringify(value));else sessionStorage.removeItem(draftKey)}catch{}}
 function enter(next:'editor'|'story'){if(view==='library'){returnFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;scroll.current=window.scrollY}setView(next);setError('');setMessage('');setDeleting(false);setConflict(false)}
 function back(){setView('library');setError('');setDeleting(false);requestAnimationFrame(()=>{returnFocus.current?.focus({preventScroll:true});window.scrollTo({top:scroll.current,behavior:'instant'})})}
 function guardDraft(){if(!editor)return false;enter('editor');setMessage('Continue your unfinished response, or discard it before opening another story.');return true}
 function create(prompt?:StoryPrompt){if(readOnly){setError('Your trial has ended. Get full access to add or edit stories; your saved stories are still available.');return;}if(guardDraft())return;draft({...blank,title:prompt?.text??'',theme:prompt?.storyTheme??'Teamwork',prompt_id:prompt?.id??null,id:crypto.randomUUID(),version:null});setSelected(null);enter('editor')}
 function openStory(story:InterviewStory){if(!readOnly&&guardDraft())return;setSelected(story.id);enter('story')}
 function openPrompt(prompt:StoryPrompt){if(editor?.prompt_id===prompt.id){enter('editor');return}const saved=stories.find(s=>s.prompt_id===prompt.id);if(saved)openStory(saved);else create(prompt)}
 async function save(){
  if(!editor||lock.current)return;lock.current=true;revision.current++;setLoading(false);setBusy(true);setError('');setConflict(false)
  try{const r=await fetch(editor.version===null?'/api/interviews/stories':`/api/interviews/stories/${editor.id}`,{method:editor.version===null?'POST':'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(editor)}),data=await r.json();if(!r.ok){setConflict(r.status===409);throw new Error(data.error)}const story=data.story as InterviewStory;setStories(previous=>[story,...previous.filter(s=>s.id!==story.id)]);draft(null);setSelected(story.id);setView('story');setMessage(isStoryAnswered(story)?'Story saved. You can return to this prompt and edit it any time.':'Progress saved. Add the remaining sections whenever you’re ready.');router.refresh()}catch(e){setError(e instanceof Error?e.message:'Saving could not be confirmed. Your draft is kept here; retry safely.')}finally{lock.current=false;setBusy(false)}
 }
 const story=stories.find(s=>s.id===selected),prompt=findStoryPrompt(view==='editor'?editor?.prompt_id:story?.prompt_id)
 const related=story?.prompt_id?stories.filter(s=>s.prompt_id===story.prompt_id&&s.id!==story.id):[]
 async function remove(){
  if(!story||lock.current)return;lock.current=true;revision.current++;setLoading(false);setBusy(true);setError('')
  try{const r=await fetch(`/api/interviews/stories/${story.id}`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:story.version})}),data=await r.json();if(!r.ok)throw new Error(data.error);setStories(previous=>previous.filter(s=>s.id!==story.id));setSelected(null);back();setMessage('Story deleted. The prompt is still available.');router.refresh()}catch(e){setError(e instanceof Error?e.message:'Deletion could not be confirmed. Reload your stories to check.')}finally{lock.current=false;setBusy(false)}
 }
 return <main className="page-frame page-shell">
  <header><h1 className="page-title">Your story bank</h1><p className="mt-3 max-w-2xl text-base leading-7 text-muted">Explore 104 prompts to uncover your own experiences. Start a response, save your progress and return whenever you want to reflect or refine.</p><p className="mt-2 text-sm text-muted">Your stories are private to your account.</p></header>
  <div className="mt-6"><InterviewCytoCoach mood="studying" label="Cyto’s story-finding method" messages={[
   {title:'Real and specific beats polished.',body:'Start with the awkward detail you remember clearly. That is usually where your judgement and reflection become believable.'},
   {title:'I colour-coded 104 prompts. You do not have to.',body:'Choose the prompt that brings one moment to mind quickly. A small honest story is useful practice.'},
   {title:'Reflection is the bit after “and then”.',body:'Explain what changed in your thinking, and what you would carry into medicine now.'},
  ]}/></div>
  <section data-interview-tour="story-bank" className="mt-8">
   {error&&<div role="alert" className="mb-5 rounded-2xl border border-border bg-surface p-4 text-sm leading-6"><p>{error}</p>{view!=='editor'&&<button className="mt-2 min-h-11 font-semibold text-brand underline" onClick={()=>void refresh()}>Reload saved stories</button>}{conflict&&editor&&<button className="mt-2 min-h-11 font-semibold text-brand underline" onClick={()=>{draft({...editor,id:crypto.randomUUID(),version:null});setConflict(false);setError('Your draft is now a new story. Select Save to keep both versions.')}}>Keep this draft as a new story</button>}</div>}
   {message&&<p role="status" className="mb-5 text-sm leading-6 text-mint-deep">{message}</p>}
   <div hidden={view!=='library'}>
    {editor&&<div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-muted/50 p-4"><div><p className="text-sm font-semibold">Unfinished response in this tab</p><p className="mt-1 text-sm text-muted">{editor.title||'Your own story'}</p></div><button className={secondary} onClick={()=>enter('editor')}>Continue writing</button></div>}
    <StoryPromptLibrary stories={stories} loading={loading} onPrompt={openPrompt} onStory={openStory} onCreate={()=>create()}/>
   </div>
   {view==='editor'&&editor&&<form onSubmit={e=>{e.preventDefault();void save()}} className="mx-auto max-w-3xl">
    <button type="button" disabled={busy} className="mb-5 min-h-11 text-sm font-semibold text-brand" onClick={back}>← Back to library</button>
    <h2 ref={heading} tabIndex={-1} className="scroll-mt-24 break-words font-display text-2xl font-semibold leading-snug outline-none sm:text-3xl">{prompt?.text??(editor.version===null?'Add your own story':'Edit your story')}</h2>
    <p className="mt-3 text-sm leading-6 text-muted">{prompt?`${storyPromptCategory(prompt.category)} · `:''}Save any section to start. Complete all three when you’re ready.</p>
    <fieldset disabled={busy} className="mt-6 space-y-5 disabled:opacity-70">
     <div className={`grid gap-4 ${prompt?'':'sm:grid-cols-[minmax(0,1fr)_180px]'}`}><label className="text-sm font-semibold">Story title<input required maxLength={120} value={editor.title} onChange={e=>draft({...editor,title:e.target.value})} className="mt-2 block min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 font-normal focus:outline-brand" placeholder="A difficult team conversation"/></label>{!prompt&&<label className="text-sm font-semibold">Theme<select value={editor.theme} onChange={e=>draft({...editor,theme:e.target.value as StoryDraft['theme']})} className="mt-2 block min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 font-normal">{STORY_THEMES.map(t=><option key={t}>{t}</option>)}</select></label>}</div>
     {sections.map(([key,label,hint])=><label key={key} className="block text-sm font-semibold">{label}<span className="mt-1 block text-sm font-normal text-muted">{hint}</span><textarea maxLength={2000} rows={5} value={editor[key]} onChange={e=>draft({...editor,[key]:e.target.value})} className="mt-2 w-full rounded-xl border border-border bg-surface p-4 text-base font-normal leading-7 focus:outline-brand"/><span className="mt-1 block text-right text-xs font-normal tabular-nums text-muted">{editor[key].length}/2,000</span></label>)}
    </fieldset>
    <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-3 border-t border-border bg-background py-4"><button disabled={readOnly||busy||![editor.context,editor.actions,editor.reflection].some(s=>s.trim())} className={button}>{busy?'Saving…':isStoryAnswered(editor)?'Save story':'Save progress'}</button><button type="button" disabled={busy} className={secondary} onClick={()=>{draft(null);setConflict(false);back();setMessage('Unfinished changes discarded.')}}>Discard changes</button><span className="text-xs text-muted">Unfinished edits stay in this browser tab.</span></div>
   </form>}
   {view==='story'&&story&&<article className="mx-auto max-w-3xl">
    <button className="mb-5 min-h-11 text-sm font-semibold text-brand" onClick={back}>← Back to library</button>
    <h2 ref={heading} tabIndex={-1} className="scroll-mt-24 break-words font-display text-2xl font-semibold leading-snug outline-none sm:text-3xl">{prompt?.text??story.title}</h2>
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2"><p className="text-sm text-muted">{prompt?storyPromptCategory(prompt.category):story.theme}</p><StoryStatus status={isStoryAnswered(story)?'answered':'in-progress'}/><p className="text-xs text-muted">Updated {new Date(story.updated_at).toLocaleDateString('en-AU')}</p></div>
    <div className="my-6 flex flex-wrap gap-3"><button disabled={readOnly} className={button} onClick={()=>{draft({...story});enter('editor')}}>{isStoryAnswered(story)?'Edit response':'Continue response'}</button>{prompt&&<button disabled={readOnly} className={secondary} onClick={()=>create(prompt)}>Add another experience</button>}</div>
    {story.title!==prompt?.text&&prompt&&<p className="mb-6 text-lg font-semibold">{story.title}</p>}
    <div className="divide-y divide-border rounded-xl bg-surface px-5 sm:px-7">{sections.map(([key,label])=><section key={key} className="py-6"><h3 className="font-semibold">{label}</h3><p className="mt-2 whitespace-pre-wrap break-words text-base leading-7 text-muted">{story[key]||'Not added yet. Continue your response when you’re ready.'}</p></section>)}</div>
    {related.length>0&&<section className="mt-8"><h3 className="font-semibold">Other experiences for this prompt</h3><ul className="mt-3 divide-y divide-border">{related.map(s=><li key={s.id}><button className="min-h-11 w-full py-3 text-left text-sm font-semibold text-brand" onClick={()=>openStory(s)}>{s.title}</button></li>)}</ul></section>}
    <button className="mt-6 min-h-11 text-sm text-muted underline underline-offset-4" onClick={()=>setDeleting(true)}>Delete this story</button>
    {deleting&&<div className="mt-4 rounded-xl border border-border p-5"><p className="text-sm">Delete this saved response permanently? The prompt stays in your library.</p><div className="mt-3 flex gap-3"><button disabled={busy} className={secondary} onClick={remove}>Delete permanently</button><button disabled={busy} className={secondary} onClick={()=>setDeleting(false)}>Keep story</button></div></div>}
   </article>}
   {view==='story'&&!story&&<div className="py-8"><p className="text-sm text-muted">This story is no longer available. Reload your saved stories to check.</p><button className={`${secondary} mt-4`} onClick={back}>Back to library</button></div>}
  </section>
 </main>
}
