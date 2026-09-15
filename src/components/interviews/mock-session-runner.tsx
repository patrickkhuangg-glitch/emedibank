'use client'
import { RecordingRetentionNotice } from '@/components/interviews/recording-retention-notice'
import Link from 'next/link'
import { MMIQuestionProgress } from './station-progress'
import { RoleplayStage } from './roleplay-stage'
import { InterviewPrompt, InterviewTimerBar } from './question-display'
import { practiceButtonPrimary, practiceButtonSecondary } from './practice-buttons'
import { MockMarkingActions } from './mock-marking-actions'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MockSelection, MockView } from '@/lib/interviews/mock-types'
import { CAPTURE_CONSTRAINTS, prepareRecorders, startRecording } from '@/lib/interviews/recording'
import { validateMedia } from '@/lib/interviews/media-validation'
import { uploadInterviewMedia } from '@/lib/interviews/video-upload'
import {uploadPhaseLabel,type UploadPhase} from '@/lib/interviews/upload-admission'
import { finaliseInterviewUpload } from '@/lib/interviews/finalise-upload'
import { deleteDraft, markSegmentSaved, putDraft, putSegment, readDraft, readSegment, type LocalSegment, type MockDraft } from '@/lib/interviews/mock-local'
import type { QuestionEvent } from '@/lib/interviews/media-validation'
import styles from './session-experience.module.css'

type Screen='setup'|'camera'|'running'|'review'|'saving'|'complete'
const button=practiceButtonPrimary
const secondary=practiceButtonSecondary
const clock=(seconds:number)=>`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`
export function MockSessionRunner({selection,draftId,userId,enabled,trial=false}:{selection:MockSelection;draftId?:string;userId:string;enabled:boolean;trial?:boolean}) {
 const startRequestId=useRef(crypto.randomUUID())
 const [uploadPhase,setUploadPhase]=useState<UploadPhase>('waiting')
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
  const previous=currentView.current
  const continuing=!!active.current&&previous?.index===next.index&&next.phase==='response'
  currentView.current=next;setView(next);setQuestion(0)
  deadline.current=performance.now()+Math.max(0,next.phaseEndsAt-next.serverNow)
  setSeconds(Math.max(0,Math.ceil((next.phaseEndsAt-next.serverNow)/1000)))
  if(continuing){
   if(next.responsePart&&previous?.responsePart?.questionIndex!==next.responsePart.questionIndex)events.current.push({question_index:next.responsePart.questionIndex,offset_seconds:(performance.now()-active.current!.started)/1000})
  } else if(next.phase==='response'){
   if(!media.current)throw new Error('Camera access was lost. Completed responses are kept on this device.')
   events.current=[{question_index:0,offset_seconds:0}]
   if(next.responsePart?.questionIndex)events.current.push({question_index:next.responsePart.questionIndex,offset_seconds:0})
   active.current=startRecording(prepareRecorders(media.current),()=>{void endHandler.current('Recording was interrupted. Review the responses captured so far.')})
  }
 },[])
 const advance=useCallback(async()=>{
  if(transition.current||ended.current||!currentDraft.current)return
  transition.current=true;setChanging(true)
  try{
   // Keep one recorder through the role-play-to-reflection boundary.
   if(currentView.current?.responsePart?.kind!=='roleplay'||currentView.current?.phase!=='response')await archive()
   const response=await fetch('/api/interviews/mock-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:currentDraft.current.token}),signal:AbortSignal.timeout(15000)})
   const result=await response.json();if(!response.ok)throw new Error(result.error||'The next prompt could not load.')
   if(ended.current)return
   if(result.view.phase==='complete'){transition.current=false;await endMock();return}
   if(active.current&&(result.view.index!==currentView.current?.index||result.view.phase!=='response'))await archive()
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
   const response=await fetch('/api/interviews/mock-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start',selection,startId:startRequestId.current}),signal:AbortSignal.timeout(15000)})
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
    setProgress(0);setUploadPhase('waiting');setUploadLabel(`Response ${info.index+1} of ${session.total}`)
    let alreadySaved=false
    if(!segment.shell){
     const response=await fetch('/api/interviews/attempts/initiate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mockToken:session.token,mockIndex:info.index,videoType:segment.video.type,audioType:segment.audio?.type??null})})
     const result=await response.json();if(!response.ok)throw new Error(result.error)
     segment={...segment,shell:result};alreadySaved=result.uploadStatus==='ready'
     await persist()
    }
    const shell=segment.shell!
    if(!alreadySaved){
     if(!segment.videoUploaded){await uploadInterviewMedia(segment.video,shell.videoPath,setProgress,uploadAbort.current.signal,setUploadPhase);segment={...segment,videoUploaded:true};await persist()}
     if(segment.audio&&shell.audioPath&&!segment.audioUploaded){
      setUploadLabel(`Response ${info.index+1} · transcription audio`)
      try{await uploadInterviewMedia(segment.audio,shell.audioPath,setProgress,uploadAbort.current.signal,setUploadPhase);segment={...segment,audioUploaded:true};await persist()}
      catch{if(uploadAbort.current.signal.aborted)throw new Error('Saving paused. Your uploaded video is safe.');setError('A transcription copy could not save. Its video remains available for manual marking.')}
     }
     setUploadPhase('saving')
     const response=await finaliseInterviewUpload(shell.attemptId,{durationSeconds:segment.durationSeconds,questionEvents:segment.events},uploadAbort.current.signal)
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
 const heading=full?(format==='mmi'?(trial?'Two-station trial MMI':'Eight-station MMI'):(draft?'Full panel interview':'20-minute full panel interview')):(format==='mmi'?'Individual MMI station':'Individual panel question')
 const unsaved=draft?.segments.filter(s=>!s.saved).length??0
 const completeFullMock=full&&!(trial&&format==='mmi')&&!!draft&&(format==='panel'?draft.segments.length>=2:draft.segments.length===draft.total)
 return <main className={styles.sessionBackdrop}>
  <section className={styles.sessionShell}>
   <header className={styles.sessionHeader}>
    <div><p className={styles.eyebrow}>Mock Interviews</p><h1 className={`${styles.title} font-display text-3xl font-semibold leading-tight sm:text-4xl`}>{heading}</h1></div>
    {screen==='running'&&view&&<div className={styles.liveBadge}><span className={styles.liveDot} aria-hidden="true" />{view.phase==='preparation'?'Timed reading':'Recording'}</div>}
   </header>
   {!enabled&&!draftId?<div className={styles.setupCard}><p>New mock recordings are currently unavailable. <Link className="font-semibold text-brand" href="/interviews/mock-interviews/review">Open saved recordings</Link>.</p></div>:<>
    {screen==='setup'&&!draftId&&<div className={styles.setupCard}>
     <div className={styles.setupLead}><p><strong>Check your camera and microphone before the timer begins.</strong></p><p>Your questions stay hidden until the mock starts.</p></div>
     <div className={styles.factGrid}>
      <div className={styles.factCard}><span className={styles.factLabel}>Format</span><span className={styles.factValue}>{format==='mmi'?'MMI':'Panel interview'}</span></div>
      <div className={styles.factCard}><span className={styles.factLabel}>Timing</span><span className={styles.factValue}>{full?(format==='mmi'?`${trial?'2':'8'} stations · ${trial?'20':'80'} min`:'10 questions · 20 minutes · 2 minutes per question'):(format==='mmi'?'2 min read · 8 min response':'2 min response')}</span></div>
      <div className={styles.factCard}><span className={styles.factLabel}>Review</span><span className={styles.factValue}>Record and review free</span></div>
     </div>
     <p className="mb-5 text-sm leading-6 text-muted">{full?(format==='mmi'?`Each station gives you 2 minutes to read and 8 minutes to respond.`:'Each question gives you 2 minutes to respond.'):(format==='mmi'?'2 minutes to read, then 8 minutes to respond.':'The 2-minute response timer starts immediately.')}{full&&' The mock moves on automatically.'}</p>
     <div className={styles.actionRow}><button data-haptic="confirm" className={button} disabled={busy||!enabled} onClick={allowCamera}>{busy?'Opening camera…':'Allow camera and microphone'}</button></div>
     <p className={styles.privacyNote}>Optional tutor marking: {full&&!(trial&&format==='mmi')?'12 credits for the full mock':format==='mmi'?'2 credits per station':'1 credit'}. Nothing is charged when you record.</p>
    </div>}
    {screen==='camera'&&<>
     <div className={styles.cameraCard}>
      <video ref={camera} autoPlay muted playsInline aria-label="Camera setup preview" className={styles.cameraVideo}/>
      <div className={styles.cameraFooter}><div><strong>Camera ready</strong><p className="mt-1 text-sm">Check your framing and sound before you begin.</p></div><span className={styles.phaseBadge}><span className={styles.liveDot} aria-hidden="true" />Private preview</span></div>
     </div>
     <div className={styles.sessionDock}><p>Keep this tab visible. Switching tabs or closing it ends the timed session.</p><div className={styles.actionRow}><button data-haptic="confirm" className={button} disabled={busy} onClick={start}>{busy?'Starting…':`Start timed ${full?'mock':'response'}`}</button><button data-haptic="soft" className={secondary} disabled={busy} onClick={()=>{release();setScreen('setup')}}>Cancel setup</button></div></div>
    </>}
    {screen==='running'&&view&&<div className={styles.activeStage}>
     <div className={styles.stageTopline}><strong>{format==='mmi'?`Station ${view.index+1} of ${view.total}`:`Question ${view.index+1} of ${view.total}`}</strong><span>{view.title}</span></div>
     <div key={`${view.index}-${view.phase}-${view.responsePart?.kind??question}`} className={styles.stageBody}>
      {view.responsePart?(changing?<div role="status" className={styles.transitionCard}>Opening the next part…</div>:<RoleplayStage stage={view.phase==='preparation'?'preparation':view.responsePart.kind} seconds={seconds} scenario={view.preparation} question={view.questions[0]} recording/>):<>
       {format==='mmi'&&<MMIQuestionProgress preparation={view.phase==='preparation'} questionIndex={question} questionCount={view.questionCount??view.questions.length}/>}
       <InterviewTimerBar tone={view.phase==='preparation'?'preparation':'response'} label={`${format==='mmi'?'Station':'Question'} ${view.index+1} of ${view.total} · ${view.phase==='preparation'?'Timed reading':'Recording'}`} seconds={seconds}/>
       {changing?<div role="status" className={styles.transitionCard}>Opening the next section…</div>:<div className="space-y-3"><p className="text-sm font-medium text-muted">{view.title}</p><InterviewPrompt preparation={view.phase==='preparation'&&format==='mmi'} text={view.phase==='preparation'?view.preparation:view.questions[question]} questionNumber={format==='panel'?view.index+1:question+1} questionCount={format==='panel'?view.total:view.questions.length} scenario={format==='mmi'?view.preparation:undefined}>
        {view.phase==='response'&&view.questions.length>1&&<button data-haptic="confirm" className={secondary} disabled={question>=view.questions.length-1} onClick={()=>{if(!active.current||question>=view.questions.length-1)return;const next=question+1;events.current.push({question_index:next,offset_seconds:(performance.now()-active.current.started)/1000});setQuestion(next)}}>{question===view.questions.length-1?'Continue your response until time ends':'Next follow-up'}</button>}
       </InterviewPrompt></div>}
      </>}
     </div>
     <div className={styles.sessionDock}><p>{view.phase==='preparation'?'Recording starts automatically when reading time ends.':'The next section begins automatically when time expires.'} Keep this tab visible.</p><button data-haptic="soft" className={secondary} disabled={changing} onClick={()=>{if(window.confirm('End this mock early? You can review the responses captured so far.'))void endMock('Mock ended early. Only responses captured so far are available.')}}>End mock early</button></div>
    </div>}
    {(screen==='review'||screen==='saving')&&draft&&<div className={styles.reviewCard}>
     <h2 className="font-display text-2xl font-semibold">Review before saving</h2><div className="mt-5"><RecordingRetentionNotice/></div><p className="mt-4">{draft.segments.length} of {draft.total} responses recorded. Review and save them for free.</p>
     <ul className={styles.recordingList}>{draft.segments.map(info=><li key={info.index} className={styles.recordingItem}><span>Response {info.index+1} · {info.title} · {clock(Math.ceil(info.durationSeconds))}</span>{info.saved?<span className="text-sm font-semibold text-brand">Saved to your account</span>:<button data-haptic="soft" className={secondary} disabled={screen==='saving'} onClick={()=>{setPreviewUrl('');setSelected(info.index)}}>Preview response {info.index+1}</button>}</li>)}</ul>
     {previewUrl&&selected!==null&&<div className="my-5 space-y-3"><video src={previewUrl} controls playsInline className="max-h-[55vh] w-full rounded-2xl bg-black"/><a className="text-sm font-semibold text-brand" href={previewUrl} download={`mock-response-${selected+1}`}>Download this response</a></div>}
     {screen==='saving'?<div role="status" className="space-y-3"><p>{uploadLabel} · {uploadPhaseLabel[uploadPhase]}{uploadPhase==='uploading'?` · ${progress}%`:''}</p><progress max={100} value={progress} className={styles.progressTrack} aria-label="Saving progress"/><button data-haptic="soft" className={secondary} onClick={()=>uploadAbort.current?.abort()}>Pause saving</button></div>:<div className={styles.actionRow}>{unsaved>0&&<button data-haptic="confirm" className={button} disabled={busy} onClick={saveAll}>Save {unsaved} {unsaved===1?'recording':'recordings'}</button>}<button data-haptic="soft" className={secondary} disabled={busy} onClick={discard}>{unsaved?'Discard unsaved recordings':'Finish review'}</button></div>}
     {completeFullMock&&<p className="mt-5 text-sm leading-6 text-muted">Save your responses to submit the full mock for tutor marking (12 credits).</p>}
     <p className="mt-3 text-sm leading-6 text-muted">Save any recordings you want to keep within seven days, using this browser. Clearing browser data deletes unsaved recordings.</p>
    </div>}
    {screen==='complete'&&<div className={`${styles.completionCard} space-y-5`}><h2 className="font-display text-2xl font-semibold">Session finished</h2><RecordingRetentionNotice/><p>Saved responses are available for private review and optional marking.</p>{completeFullMock&&unsaved===0&&<MockMarkingActions sessionId={draft!.id}/>}<Link className={button} href="/interviews/mock-interviews/review">Recordings &amp; feedback</Link></div>}
    {error&&<p role="alert" className={styles.errorBanner}>{error}</p>}
   </>}
   {screen!=='running'&&screen!=='saving'&&<p className={styles.backLink}><Link className="text-sm font-semibold" href="/interviews/mock-interviews">← Back to Mock Interviews</Link></p>}
  </section>
 </main>
}
