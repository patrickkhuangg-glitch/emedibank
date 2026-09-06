'use client'
import Link from 'next/link'
import { useCallback,useEffect,useRef,useState } from 'react'
import type { InterviewStation } from '@/lib/interviews/stations'
import { getInterviewQuestions,getInterviewTiming } from '@/lib/interviews/timing'
import { CAPTURE_CONSTRAINTS,prepareRecorders,startRecording,type LocalRecording } from '@/lib/interviews/recording'
import { uploadInterviewMedia } from '@/lib/interviews/video-upload'
import { validateMedia,type QuestionEvent } from '@/lib/interviews/video-validation'

type Phase='ready'|'preview'|'preparation'|'response'|'stopping'|'review'|'saving'|'complete'
type Shell={attemptId:string;videoPath:string;audioPath:string|null}
const button='rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground disabled:opacity-50'
export function InterviewPracticeRunner({station,enabled=false}:{station:InterviewStation;enabled?:boolean}) {
 const timing=getInterviewTiming(station.format),questions=getInterviewQuestions(station)
 const [phase,setPhase]=useState<Phase>('ready'),[seconds,setSeconds]=useState<number>(timing.preparationSeconds),[question,setQuestion]=useState(0)
 const [error,setError]=useState(''),[progress,setProgress]=useState(0),[uploadStage,setUploadStage]=useState(''),[local,setLocal]=useState<LocalRecording|null>(null),[localUrl,setLocalUrl]=useState('')
 const urlRef=useRef('')
 const stream=useRef<MediaStream|null>(null),preview=useRef<HTMLVideoElement|null>(null),prepared=useRef<ReturnType<typeof prepareRecorders>|null>(null)
 const active=useRef<ReturnType<typeof startRecording>|null>(null),deadline=useRef(0),events=useRef<QuestionEvent[]>([]),shell=useRef<Shell|null>(null),videoUploaded=useRef(false),audioUploaded=useRef(false),abort=useRef<AbortController|null>(null),busy=useRef(false),mounted=useRef(true)
 const releaseTracks=useCallback(()=>{stream.current?.getTracks().forEach(t=>t.stop());stream.current=null},[])
 const finish=useCallback(async()=>{
 if(!active.current||busy.current)return
 busy.current=true;setPhase('stopping')
 try{const recording=await active.current.stop();validateMedia(recording.video.type,recording.video.size,'video');if(urlRef.current)URL.revokeObjectURL(urlRef.current);urlRef.current=URL.createObjectURL(recording.video);setLocalUrl(urlRef.current);setLocal(recording);setPhase('review');if(!recording.audio)setError('Your video is safe. Automatic transcription is unavailable for this recording; a reviewer can still mark it manually.')}
 catch{setError('The video could not be completed. Please try again.');setPhase('ready')}
 finally{active.current=null;releaseTracks();busy.current=false}
 },[releaseTracks])
 const beginResponse=useCallback(()=>{
 if(!prepared.current)return
 try{active.current=startRecording(prepared.current,()=>{setError('Recording was interrupted. Review the captured video before saving.');void finish()});events.current=[{question_index:0,offset_seconds:0}];deadline.current=performance.now()+timing.responseSeconds*1000;setSeconds(timing.responseSeconds);setPhase('response')}
 catch{releaseTracks();setError('The camera could not start recording. Check permissions and try again.');setPhase('ready')}
 },[finish,releaseTracks,timing.responseSeconds])
 async function allowCamera(){
 if(busy.current)return;busy.current=true;setError('')
 try{
 if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Use a secure page in a current Chrome, Safari or Edge browser with camera recording support.')
 const media=await navigator.mediaDevices.getUserMedia(CAPTURE_CONSTRAINTS)
 if(!mounted.current){media.getTracks().forEach(t=>t.stop());return}
 stream.current=media;prepared.current=prepareRecorders(media);if(!prepared.current.audio)setError('This browser can save video but cannot create a separate transcription copy. You can still self-review and request manual marking.');setPhase('preview')
 }catch(e){releaseTracks();setError(e instanceof DOMException&&e.name==='NotAllowedError'?'Camera or microphone access is blocked. In the site controls beside the address bar, set Camera and Microphone to Allow, then try again.':e instanceof Error?e.message:'Check your camera and microphone, then try again.')}
 finally{busy.current=false}
 }
 function prepare(){deadline.current=performance.now()+timing.preparationSeconds*1000;setSeconds(timing.preparationSeconds);setPhase('preparation')}
 const nextQuestion=useCallback(()=>{
 if(question===questions.length-1){void finish();return}
 const index=question+1;events.current.push({question_index:index,offset_seconds:(performance.now()-(active.current?.started??performance.now()))/1000});setQuestion(index)
 },[finish,question,questions.length])
 useEffect(()=>{
 if(phase!=='preparation'&&phase!=='response')return
 const timer=setInterval(()=>{const remaining=Math.max(0,Math.ceil((deadline.current-performance.now())/1000));setSeconds(remaining);if(!remaining){clearInterval(timer);if(phase==='preparation')beginResponse();else void finish()}},200)
 return()=>clearInterval(timer)
 },[phase,beginResponse,finish])
 useEffect(()=>{if(preview.current&&stream.current)preview.current.srcObject=stream.current},[phase])
 useEffect(()=>{
 function key(e:KeyboardEvent){if(phase==='response'&&e.code==='Space'&&!e.repeat&&!(e.target instanceof HTMLElement&&e.target.closest('button,a,input,textarea,select,video'))){e.preventDefault();nextQuestion()}}
 window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)
 },[nextQuestion,phase])
 useEffect(()=>{
 const hidden=()=>{if(document.hidden&&phase==='response'){setError('Recording stopped because this tab was hidden. Preview the captured response before saving.');void finish()}}
 document.addEventListener('visibilitychange',hidden)
 return()=>document.removeEventListener('visibilitychange',hidden)
 },[phase,finish])
 useEffect(()=>{
 const unsafe=['preview','preparation','response','stopping','review','saving'].includes(phase)
 const leave=(e:BeforeUnloadEvent)=>{if(unsafe){e.preventDefault();e.returnValue=''}}
 const navigate=(event:MouseEvent)=>{
 if(!unsafe||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return
 const link=event.target instanceof Element?event.target.closest('a'):null
 if(!link||link.target==='_blank'||link.hasAttribute('download'))return
 const target=new URL(link.href,window.location.href)
 if(target.pathname===window.location.pathname&&target.search===window.location.search)return
 if(!window.confirm('Leave this recording? Unsaved local video will be lost. Keep this tab open to finish saving.')){event.preventDefault();event.stopImmediatePropagation()}
 }
 window.addEventListener('beforeunload',leave)
 document.addEventListener('click',navigate,true)
 return()=>{window.removeEventListener('beforeunload',leave);document.removeEventListener('click',navigate,true)}
 },[phase])
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(urlRef.current)URL.revokeObjectURL(urlRef.current);abort.current?.abort();void active.current?.stop();releaseTracks()}},[releaseTracks])
 async function save(){
 if(!local||busy.current)return;busy.current=true;setError('');setPhase('saving');abort.current=new AbortController()
 try{
 if(!shell.current){const response=await fetch('/api/interviews/attempts/initiate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stationId:station.id,format:station.format,videoType:local.video.type,audioType:local.audio?.type??null})});const result=await response.json();if(!response.ok)throw new Error(result.error);shell.current=result}
 const current=shell.current!
 if(!videoUploaded.current){setUploadStage('Saving video');setProgress(0);await uploadInterviewMedia(local.video,current.videoPath,setProgress,abort.current.signal);videoUploaded.current=true}
 if(local.audio&&current.audioPath&&!audioUploaded.current){setUploadStage('Saving transcription audio');setProgress(0);try{await uploadInterviewMedia(local.audio,current.audioPath,setProgress,abort.current.signal);audioUploaded.current=true}catch{if(abort.current.signal.aborted)throw new Error('Upload paused. Your saved video is safe. Select Save attempt to resume.');setError('Your video was saved. The audio copy could not upload; staff can review the video manually.')}}
 setUploadStage('Finishing save')
 const response=await fetch(`/api/interviews/attempts/${current.attemptId}/finalise`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({durationSeconds:local.durationSeconds,questionEvents:events.current})})
 const result=await response.json();if(!response.ok)throw new Error(result.error)
 setLocal(null);if(urlRef.current)URL.revokeObjectURL(urlRef.current);urlRef.current='';setPhase('complete')
 }catch(e){setError(e instanceof Error?e.message:'Save interrupted. Keep this tab open and try again.');setPhase('review')}
 finally{busy.current=false}
 }
 async function discard(){
 if(busy.current)return;busy.current=true
 try{if(shell.current){const response=await fetch(`/api/interviews/attempts/${shell.current.attemptId}`,{method:'DELETE'});if(!response.ok)throw new Error('The unfinished upload could not be deleted. Try again before discarding.')}
 releaseTracks();setLocal(null);if(urlRef.current)URL.revokeObjectURL(urlRef.current);urlRef.current='';setLocalUrl('');shell.current=null;videoUploaded.current=false;audioUploaded.current=false;setQuestion(0);setError('');setPhase('ready')
 }catch(e){setError(e instanceof Error?e.message:'Discard failed. Try again.')}finally{busy.current=false}
 }
 return <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8"><section className="mx-auto max-w-4xl space-y-6">
 <p className="text-sm font-semibold text-brand">Mock Interviews · {station.format==='mmi'?'MMI station':'Panel interview'}</p><h1 className="font-display text-3xl font-semibold sm:text-5xl">{station.title}</h1>
 {!enabled?<><p>New mock recordings are being prepared. Your previous recordings remain available.</p><Link href="/interviews/mock-interviews/review">Review saved attempts</Link></>:<>
 {phase==='ready'&&<><p className="max-w-2xl leading-7 text-muted">Record with your camera and microphone, then preview before saving. Your recording is private. Self-review is free; submitting for human-reviewed marking costs one Interview marking credit and allows EMeducate admins to review your recording and approved AI services to process its transcript.</p><p className="text-sm text-muted">Videos expire after 90 days by default; pending reviews are protected. Transcripts and approved feedback remain until you delete the attempt. Recording starts only after preparation.</p><button className={button} onClick={allowCamera}>Allow camera and microphone</button></>}
 {phase==='preview'&&<><video ref={preview} autoPlay muted playsInline className="max-h-[50vh] w-full rounded-2xl bg-black" aria-label="Live camera preview"/><p>Check that you are visible and your microphone is connected. Preparation lasts {timing.preparationLabel}; your response is limited to {timing.responseLabel}.</p><button className={button} onClick={prepare}>Begin preparation</button><button className="ml-3 rounded-full border px-5 py-3" onClick={discard}>Cancel</button></>}
 {(phase==='preparation'||phase==='response')&&<><div className="flex flex-wrap justify-between gap-3"><p role="status">{phase==='preparation'?'Preparation — not recording':'● Recording video and microphone'}</p><p className="font-mono text-3xl tabular-nums" aria-label={`${seconds} seconds remaining`}>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</p></div><div className="rounded-3xl bg-surface p-6 sm:p-10"><p className="text-sm text-muted">{phase==='preparation'?station.category:`Question ${question+1} of ${questions.length}`}</p><h2 className="mt-5 font-display text-2xl leading-snug sm:text-4xl">{phase==='preparation'?station.preparation:questions[question]}</h2>{phase==='response'&&<div className="mt-8 flex flex-wrap items-center gap-4"><button className={button} onClick={nextQuestion}>{question===questions.length-1?'Finish and preview':'Next question'}</button><p className="text-sm text-muted">Space also continues</p></div>}</div></>}
 {phase==='stopping'&&<p role="status">Preparing your local preview…</p>}
 {(phase==='review'||phase==='saving')&&<><video src={localUrl} controls playsInline className="max-h-[55vh] w-full rounded-2xl bg-black"/><p>This preview is on your device. Saving keeps it privately in your account without spending a marking credit.</p>{phase==='saving'?<div role="status"><p>{uploadStage} — {progress}%</p><progress className="w-full" max={100} value={progress} aria-label={uploadStage}/><button className="rounded-full border px-5 py-3" onClick={()=>abort.current?.abort()}>Pause upload</button></div>:<div className="flex flex-wrap gap-3"><button className={button} onClick={save}>Save attempt</button><button className="rounded-full border px-5 py-3" onClick={discard}>Discard and try again</button></div>}<p className="text-sm text-muted">Keep this tab open until saving finishes. Interrupted uploads resume when you select Save attempt. Closing the tab loses the local recording.</p></>}
 {phase==='complete'&&<><h2 className="font-display text-2xl">Recording saved privately</h2><p>Your transcript will be prepared in the background. You can choose human-reviewed marking from your saved attempt.</p><Link className={button} href="/interviews/mock-interviews/review">Review recording</Link></>}
 {error&&<p role="alert" className="rounded-2xl border border-border p-4">{error}</p>}
 {['ready','complete'].includes(phase)&&<p><Link href="/interviews/mock-interviews" className="text-sm font-semibold">Back to Mock Interviews</Link></p>}
 </>}
 </section></main>
}
