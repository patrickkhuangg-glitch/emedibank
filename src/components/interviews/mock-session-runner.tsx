'use client'
import Link from 'next/link'
import { MockMarkingActions } from './mock-marking-actions'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MockSelection, MockView } from '@/lib/interviews/mock-types'
import { CAPTURE_CONSTRAINTS, prepareRecorders, startRecording } from '@/lib/interviews/recording'
import { validateMedia } from '@/lib/interviews/media-validation'
import { uploadInterviewMedia } from '@/lib/interviews/video-upload'
import { deleteDraft, markSegmentSaved, putDraft, putSegment, readDraft, readSegment, type LocalSegment, type MockDraft } from '@/lib/interviews/mock-local'
import type { QuestionEvent } from '@/lib/interviews/media-validation'

type Screen='setup'|'camera'|'running'|'review'|'saving'|'complete'
const button='rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground disabled:opacity-50'
const secondary='rounded-full border border-border px-5 py-3 text-sm font-semibold disabled:opacity-50'
const clock=(seconds:number)=>`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`
export function MockSessionRunner({selection,draftId,userId,enabled}:{selection:MockSelection;draftId?:string;userId:string;enabled:boolean}) {
 const [screen,setScreen]=useState<Screen>('setup'),[draft,setDraft]=useState<MockDraft|null>(null),[view,setView]=useState<MockView|null>(null)
 const [seconds,setSeconds]=useState(0),[question,setQuestion]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false),[changing,setChanging]=useState(false)
 const [selected,setSelected]=useState<number|null>(null),[previewUrl,setPreviewUrl]=useState(''),[progress,setProgress]=useState(0),[uploadLabel,setUploadLabel]=useState('')
 const media=useRef<MediaStream|null>(null),camera=useRef<HTMLVideoElement|null>(null),active=useRef<ReturnType<typeof startRecording>|null>(null)
 const currentDraft=useRef<MockDraft|null>(null),currentView=useRef<MockView|null>(null),events=useRef<QuestionEvent[]>([]),deadline=useRef(0)
 const transition=useRef(false),ended=useRef(false),mounted=useRef(true),operation=useRef(false),uploadAbort=useRef<AbortController|null>(null)
 const archiving=useRef<Promise<void>|null>(null)
 const emergency=useRef<LocalSegment|null>(null),url=useRef(''),endHandler=useRef<(reason:string)=>Promise<void>>(async()=>{})
 const setCurrentDraft=useCallback((value:MockDraft)=>{currentDraft.current=value;if(mounted.current)setDraft(value)},[])
 const release=useCallback(()=>{media.current?.getTracks().forEach(t=>t.stop());media.current=null},[])
 const archive=useCallback(()=>{
  if(archiving.current)return archiving.current
  const work=(async()=>{
  const recorder=active.current,shown=currentView.current,session=currentDraft.current
  if(!recorder||!shown||!session)return
  active.current=null
  const recording=await recorder.stop();validateMedia(recording.video.type,recording.video.size,'video')
  const segment:LocalSegment={...recording,key:`${session.id}:${shown.index}`,sessionId:session.id,index:shown.index,title:shown.title,events:[...events.current]}
  const next={...session,segments:[...session.segments.filter(s=>s.index!==shown.index),{index:shown.index,title:shown.title,durationSeconds:recording.durationSeconds,saved:false}].sort((a,b)=>a.index-b.index)}
  setCurrentDraft(next)
  try{await putSegment(segment,next)}catch(e){emergency.current=segment;throw e}
  })()
  archiving.current=work
  void work.finally(()=>{if(archiving.current===work)archiving.current=null}).catch(()=>{})
  return work
 },[setCurrentDraft])
 const endMock=useCallback(async(reason='')=>{
  if(ended.current)return
  ended.current=true;transition.current=true;setChanging(true)
  let message=reason
  try{await archive()}catch(e){message=e instanceof Error?e.message:'The last response could not be completed.'}
  release()
  if(currentDraft.current){const next={...currentDraft.current,ended:true};setCurrentDraft(next);try{await putDraft(next)}catch{message=message||'Keep this tab open to save your recordings.'}}
  if(mounted.current){setError(message);setChanging(false);setScreen('review')}
  transition.current=false
 },[archive,release,setCurrentDraft])
 useEffect(()=>{endHandler.current=endMock},[endMock])
 const showTimedView=useCallback((next:MockView)=>{
  currentView.current=next;setView(next);setQuestion(0)
  deadline.current=performance.now()+Math.max(0,next.phaseEndsAt-next.serverNow)
  setSeconds(Math.max(0,Math.ceil((next.phaseEndsAt-next.serverNow)/1000)))
  if(next.phase==='response'){
   if(!media.current)throw new Error('Camera access was lost. Completed responses are kept on this device.')
   events.current=[{question_index:0,offset_seconds:0}]
   active.current=startRecording(prepareRecorders(media.current),()=>{void endHandler.current('Recording was interrupted. Review the responses captured so far.')})
  }
 },[])
 const advance=useCallback(async()=>{
  if(transition.current||ended.current||!currentDraft.current)return
  transition.current=true;setChanging(true)
  try{
   await archive()
   const response=await fetch('/api/interviews/mock-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:currentDraft.current.token}),signal:AbortSignal.timeout(15000)})
   const result=await response.json();if(!response.ok)throw new Error(result.error||'The next prompt could not load.')
   if(ended.current)return
   if(result.view.phase==='complete'){transition.current=false;await endMock();return}
   showTimedView(result.view)
  }catch(e){transition.current=false;await endMock(e instanceof Error?e.message:'Connection lost. Completed responses remain on this device.')}
  finally{transition.current=false;if(mounted.current)setChanging(false)}
 },[archive,endMock,showTimedView])
 useEffect(()=>{
  if(screen!=='running')return
  const timer=setInterval(()=>{if(ended.current)return;const remaining=Math.max(0,Math.ceil((deadline.current-performance.now())/1000));setSeconds(remaining);if(!remaining)void advance()},200)
  return()=>clearInterval(timer)
 },[screen,advance])
 useEffect(()=>{if(camera.current&&media.current)camera.current.srcObject=media.current},[screen])
 useEffect(()=>{
  if(!draftId)return
  let live=true
  void readDraft(draftId,userId).then(async stored=>{
   if(!live)return
   if(!stored){setError('This local mock is not available in this browser and account.');return}
   const recovered={...stored,ended:true};await putDraft(recovered)
   if(!live)return
   ended.current=true;setCurrentDraft(recovered);setScreen('review');setError('The timed session has ended. Review the completed responses recovered from this device.')
  }).catch(()=>{if(live)setError('Local recordings could not be opened. Use the browser where you recorded them.')})
  return()=>{live=false}
 },[draftId,userId,setCurrentDraft])
 useEffect(()=>{
  let live=true
  if(url.current){URL.revokeObjectURL(url.current);url.current=''}
  if(selected===null||!draft)return
  const request=emergency.current?.index===selected?Promise.resolve(emergency.current):readSegment(draft.id,selected)
  void request.then(segment=>{if(!live)return;if(segment){url.current=URL.createObjectURL(segment.video);setPreviewUrl(url.current)}}).catch(()=>{if(live)setError('The local preview could not load.')})
  return()=>{live=false;if(url.current){URL.revokeObjectURL(url.current);url.current=''}}
 },[selected,draft])
 useEffect(()=>{
  const hidden=()=>{if(document.hidden&&screen==='running')void endHandler.current('The mock ended because the tab was hidden. Completed responses are available below.')}
  const unsafe=['camera','running','saving'].includes(screen)||!!emergency.current
  const leave=(e:BeforeUnloadEvent)=>{if(unsafe){e.preventDefault();e.returnValue=''}}
  const navigate=(e:MouseEvent)=>{if(!unsafe||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey)return;const a=e.target instanceof Element?e.target.closest('a'):null;if(!a||a.target==='_blank'||a.hasAttribute('download'))return;if(!window.confirm('Leave this mock? The timed session will end and the response currently recording may be lost.')){e.preventDefault();e.stopImmediatePropagation()}}
  document.addEventListener('visibilitychange',hidden);window.addEventListener('beforeunload',leave);document.addEventListener('click',navigate,true)
  return()=>{document.removeEventListener('visibilitychange',hidden);window.removeEventListener('beforeunload',leave);document.removeEventListener('click',navigate,true)}
 },[screen])
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;ended.current=true;uploadAbort.current?.abort();void active.current?.stop();release();if(url.current)URL.revokeObjectURL(url.current)}},[release])
 async function allowCamera(){
  if(operation.current)return;operation.current=true;setBusy(true);setError('')
  try{
   // Open local storage before asking for media; long mocks must not retain all videos in RAM.
   await import('@/lib/interviews/mock-local').then(m=>m.listDrafts(userId))
   if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Use a current browser on a secure connection with camera recording support.')
   const stream=await navigator.mediaDevices.getUserMedia(CAPTURE_CONSTRAINTS)
   if(!mounted.current){stream.getTracks().forEach(t=>t.stop());return}
   media.current=stream;prepareRecorders(stream);setScreen('camera')
  }catch(e){release();setError(e instanceof DOMException&&e.name==='NotAllowedError'?'Allow camera and microphone access in your browser’s site settings, then try again.':e instanceof Error?e.message:'Camera setup failed.')}
  finally{operation.current=false;setBusy(false)}
 }
 async function start(){
  if(operation.current||!media.current)return;operation.current=true;setBusy(true);setError('')
  try{
   const response=await fetch('/api/interviews/mock-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start',selection}),signal:AbortSignal.timeout(15000)})
   const result=await response.json();if(!response.ok)throw new Error(result.error||'The timed mock could not start.')
   const next:MockDraft={id:result.view.id,userId,token:result.token,format:result.view.format,mode:result.view.mode,total:result.view.total,startedAt:result.view.startedAt,ended:false,segments:[]}
   await putDraft(next);if(!mounted.current||document.hidden){release();throw new Error('Keep this tab visible to begin the mock. Start again when you are ready.')}setCurrentDraft(next);ended.current=false;transition.current=false;showTimedView(result.view);setScreen('running')
  }catch(e){setError(e instanceof Error?e.message:'The timed mock could not start.')}
  finally{operation.current=false;setBusy(false)}
 }
 async function saveAll(){
  if(operation.current||!currentDraft.current)return;operation.current=true;setScreen('saving');setError('');uploadAbort.current=new AbortController()
  try{
   for(const info of currentDraft.current.segments.filter(s=>!s.saved)){
    const session=currentDraft.current,isEmergency=emergency.current?.index===info.index,stored=isEmergency?emergency.current:await readSegment(session.id,info.index)
    if(!stored)throw new Error('A local recording is missing. Save the remaining recordings before clearing browser data.')
    let segment:LocalSegment={...stored}
    const persist=async()=>{if(isEmergency)emergency.current=segment;else await putSegment(segment,currentDraft.current!)}
    if(uploadAbort.current.signal.aborted)throw new Error('Saving paused. Completed saves are safe; select Save recordings to continue.')
    setProgress(0);setUploadLabel(`Response ${info.index+1} of ${session.total}`)
    let alreadySaved=false
    if(!segment.shell){
     const response=await fetch('/api/interviews/attempts/initiate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mockToken:session.token,mockIndex:info.index,videoType:segment.video.type,audioType:segment.audio?.type??null})})
     const result=await response.json();if(!response.ok)throw new Error(result.error)
     segment={...segment,shell:result};alreadySaved=result.uploadStatus==='ready'
     await persist()
    }
    const shell=segment.shell!
    if(!alreadySaved){
     if(!segment.videoUploaded){await uploadInterviewMedia(segment.video,shell.videoPath,setProgress,uploadAbort.current.signal);segment={...segment,videoUploaded:true};await persist()}
     if(segment.audio&&shell.audioPath&&!segment.audioUploaded){
      setUploadLabel(`Response ${info.index+1} · transcription audio`)
      try{await uploadInterviewMedia(segment.audio,shell.audioPath,setProgress,uploadAbort.current.signal);segment={...segment,audioUploaded:true};await persist()}
      catch{if(uploadAbort.current.signal.aborted)throw new Error('Saving paused. Your uploaded video is safe.');setError('A transcription copy could not save. Its video remains available for manual marking.')}
     }
     const response=await fetch(`/api/interviews/attempts/${shell.attemptId}/finalise`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({durationSeconds:segment.durationSeconds,questionEvents:segment.events})})
     const result=await response.json();if(!response.ok)throw new Error(result.error)
    }
    const next={...currentDraft.current,segments:currentDraft.current.segments.map(s=>s.index===info.index?{...s,saved:true}:s)}
    await markSegmentSaved(next,info.index);if(emergency.current?.index===info.index)emergency.current=null;setCurrentDraft(next);setSelected(null);setPreviewUrl('')
   }
   await deleteDraft(currentDraft.current);setScreen('complete')
  }catch(e){setError(e instanceof Error?e.message:'Saving was interrupted. Your remaining recordings are kept on this device.');setScreen('review')}
  finally{operation.current=false}
 }
 async function discard(){
  if(operation.current||!currentDraft.current)return
  if(!window.confirm('Delete the unsaved recordings from this device? Any recordings already saved to your account will remain.'))return
  operation.current=true;setBusy(true)
  try{
   for(const item of currentDraft.current.segments.filter(s=>!s.saved)){
    const segment=emergency.current?.index===item.index?emergency.current:await readSegment(currentDraft.current.id,item.index)
    if(segment?.shell){const response=await fetch(`/api/interviews/attempts/${segment.shell.attemptId}`,{method:'DELETE'});if(!response.ok&&response.status!==404)throw new Error('An unfinished upload could not be removed. Retry before discarding.')}
   }
   await deleteDraft(currentDraft.current);emergency.current=null;setCurrentDraft({...currentDraft.current,segments:[]});setPreviewUrl('');setSelected(null);setScreen('complete')
  }catch(e){setError(e instanceof Error?e.message:'Could not discard recordings.')}
  finally{operation.current=false;setBusy(false)}
 }
 const full=(draft?.mode??selection.mode)==='full',format=draft?.format??selection.format
 const heading=full?(format==='mmi'?'Eight-station MMI':'30-minute panel interview'):(format==='mmi'?'Individual MMI station':'Individual panel question')
 const unsaved=draft?.segments.filter(s=>!s.saved).length??0
 const completeFullMock=full&&!!draft&&draft.segments.length===draft.total
 return <main className="mx-auto max-w-4xl space-y-6 px-5 py-10 sm:px-8"><p className="text-sm font-semibold text-brand">Mock Interviews</p><h1 className="font-display text-3xl font-semibold sm:text-5xl">{heading}</h1>
  {!enabled&&!draftId?<p>New mock recordings are currently unavailable. <Link href="/interviews/mock-interviews/review">Open saved recordings</Link>.</p>:<>
   {screen==='setup'&&!draftId&&<><p className="leading-7 text-muted">Set up your camera and microphone before starting. The scenario and question wording remain hidden until the timer begins.</p><p className="text-sm leading-6 text-muted">{full?(format==='mmi'?'8 stations · 2 minutes’ reading and 8 minutes’ response each · 80 minutes total.':'10 questions · 3 minutes each · 30 minutes total.'):(format==='mmi'?'2 minutes’ reading, then 8 minutes’ response.':'30 seconds’ reading, then 3 minutes’ response.')} Full mocks progress automatically without pauses.</p><p className="text-sm leading-6 text-muted">Recordings stay in this browser until you review and save them. Save within seven days. Clearing browser data removes unsaved recordings. Saving is free, with up to 10 response recordings saved per rolling 24 hours, subject to storage space. If you reach a limit, keep the local recordings and retry later. Marking costs 2 credits per MMI station, 1 per panel response, or 12 for either full mock. Saved videos expire after 90 days by default; pending reviews are protected.</p><button className={button} disabled={busy||!enabled} onClick={allowCamera}>Allow camera and microphone</button></>}
   {screen==='camera'&&<><video ref={camera} autoPlay muted playsInline aria-label="Camera setup preview" className="max-h-[50vh] w-full rounded-2xl bg-black"/><p>Check your picture and microphone. No prompt has been revealed and recording has not started.</p><div className="flex gap-3"><button className={button} disabled={busy} onClick={start}>Start timed {full?'mock':'response'}</button><button className={secondary} disabled={busy} onClick={()=>{release();setScreen('setup')}}>Cancel setup</button></div></>}
   {screen==='running'&&view&&<><div className="flex flex-wrap items-center justify-between gap-4"><p role="status">{format==='mmi'?'Station':'Question'} {view.index+1} of {view.total} · {view.phase==='preparation'?'Timed reading — not recording':'Recording'}</p><p className="font-mono text-4xl tabular-nums" aria-label={`${seconds} seconds remaining`}>{clock(seconds)}</p></div>
    {changing?<p role="status">Moving to the next timed section. The mock clock continues.</p>:<section className="space-y-5 rounded-3xl border border-border bg-surface p-6 sm:p-9"><p className="text-sm font-semibold text-muted">{view.title}{view.phase==='response'&&format==='mmi'?` · Follow-up ${question+1} of ${view.questions.length}`:''}</p><h2 className="font-display text-2xl leading-snug sm:text-3xl">{view.phase==='preparation'?view.preparation:view.questions[question]}</h2>{view.phase==='response'&&view.questions.length>1&&<button className={secondary} disabled={question>=view.questions.length-1} onClick={()=>{if(!active.current||question>=view.questions.length-1)return;const next=question+1;events.current.push({question_index:next,offset_seconds:(performance.now()-active.current.started)/1000});setQuestion(next)}}>{question===view.questions.length-1?'Continue your response until time ends':'Next follow-up'}</button>}</section>}
    <p className="text-sm text-muted">{view.phase==='preparation'?'Recording starts automatically when reading time ends.':'The next section begins automatically when time expires.'} Keep this tab visible.</p><button className={secondary} disabled={changing} onClick={()=>{if(window.confirm('End this mock early? You can review the responses captured so far.'))void endMock('Mock ended early. Only responses captured so far are available.')}}>End mock early</button></>}
   {(screen==='review'||screen==='saving')&&draft&&<><h2 className="font-display text-2xl font-semibold">Review before saving</h2><p>{draft.segments.length} of {draft.total} responses captured. No marking credit has been spent.</p><ul className="space-y-3">{draft.segments.map(info=><li key={info.index} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4"><span>Response {info.index+1} · {info.title} · {clock(Math.ceil(info.durationSeconds))}</span>{info.saved?<span className="text-sm text-brand">Saved to your account</span>:<button className={secondary} disabled={screen==='saving'} onClick={()=>{setPreviewUrl('');setSelected(info.index)}}>Preview response {info.index+1}</button>}</li>)}</ul>
    {previewUrl&&selected!==null&&<div className="space-y-3"><video src={previewUrl} controls playsInline className="max-h-[55vh] w-full rounded-2xl bg-black"/><a className="text-sm font-semibold text-brand" href={previewUrl} download={`mock-response-${selected+1}`}>Download this response</a></div>}
    {screen==='saving'?<div role="status"><p>{uploadLabel} · {progress}%</p><progress max={100} value={progress} className="w-full" aria-label="Saving progress"/><button className={secondary} onClick={()=>uploadAbort.current?.abort()}>Pause saving</button></div>:<div className="flex flex-wrap gap-3">{unsaved>0&&<button className={button} disabled={busy} onClick={saveAll}>Save {unsaved} {unsaved===1?'recording':'recordings'}</button>}<button className={secondary} disabled={busy} onClick={discard}>{unsaved?'Discard unsaved recordings':'Clear local session'}</button></div>}
    {completeFullMock&&<p className="text-sm leading-6 text-muted">After saving all {draft.total} responses, you can submit the entire mock for marking using 12 Interview marking credits, or keep it for self-review.</p>}
    <p className="text-sm leading-6 text-muted">You can preview every response before uploading. Save within seven days, using this browser and account. Partially saved sessions keep the remaining recordings on this device. Closing during capture loses the response still recording.</p></>}
   {screen==='complete'&&<><h2 className="font-display text-2xl font-semibold">Session finished</h2><p>Saved responses are available for private review and optional marking.</p>{completeFullMock&&unsaved===0&&<MockMarkingActions sessionId={draft!.id}/>}<Link className={button} href="/interviews/mock-interviews/review">Recordings &amp; feedback</Link></>}
   {error&&<p role="alert" className="rounded-2xl border border-border p-4 leading-6">{error}</p>}
  </>}
  {screen!=='running'&&screen!=='saving'&&<p><Link className="text-sm font-semibold" href="/interviews/mock-interviews">Back to Mock Interviews</Link></p>}
 </main>
}
