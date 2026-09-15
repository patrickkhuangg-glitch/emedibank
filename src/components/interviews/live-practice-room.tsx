'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Cyto } from '@/components/ui/cyto'
import { haptic } from '@/lib/haptics'
import { LIVE_FEEDBACK_FIELDS, canStartLiveRoom, phaseLabel, type LiveRoomSnapshot } from '@/lib/interviews/live-practice'
import { prepareRecorders, startRecording, type LocalRecording } from '@/lib/interviews/recording'
import { uploadInterviewMedia } from '@/lib/interviews/video-upload'
import { finaliseInterviewUpload } from '@/lib/interviews/finalise-upload'
import { useLivePeer } from './use-live-peer'
import styles from './live-practice.module.css'

type Shell = { attemptId: string; videoPath: string; audioPath: string | null }

export function LivePracticeRoom({ initial }: { initial: LiveRoomSnapshot }) {
  const [room, setRoom] = useState(initial), [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [copied, setCopied] = useState(false)
  const [duplicateTab, setDuplicateTab] = useState(false)
  const [seconds, setSeconds] = useState(() => remaining(initial.phaseEndsAt))
  const me = room.participants.find(item => item.id === room.participantId)!
  const peerParticipant = room.participants.find(item => !item.leftAt && item.id !== room.participantId)
  const peer = useLivePeer({ roomId: room.id, participantId: room.participantId, peerId: peerParticipant?.id, initiator: room.role === 'candidate' })
  const [consent, setConsent] = useState(me.recordingConsent ?? false)
  const [answers, setAnswers] = useState<Record<string, number | string>>({})
  const [recording, setRecording] = useState<LocalRecording | null>(null), [saving, setSaving] = useState(false), [saveProgress, setSaveProgress] = useState(0), [saveStage, setSaveStage] = useState('')
  const activeRecording = useRef<ReturnType<typeof startRecording> | null>(null), recordingRevision = useRef<number | null>(null), mixedDispose = useRef<(() => void) | null>(null)
  const shell = useRef<Shell | null>(null), videoUploaded = useRef(false), audioUploaded = useRef(false), uploadAbort = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/interviews/live-rooms/${encodeURIComponent(initial.id)}`, { cache: 'no-store' })
      const result = await response.json()
      if (response.ok) { setRoom(result); setError('') }
      else setError(result.error || 'The room could not be refreshed.')
    } catch { setError('Connection interrupted. Your room is still open; reconnecting…') }
  }, [initial.id])

  useEffect(() => { const timer = setTimeout(() => setInviteCode(sessionStorage.getItem(`live-room:${room.id}:invite`) ?? ''), 0); return () => clearTimeout(timer) }, [room.id])
  useEffect(() => {
    const key = `live-room:${room.id}:${room.participantId}:tab`, tabId = crypto.randomUUID(), now = Date.now()
    try {
      const existing = JSON.parse(localStorage.getItem(key) ?? 'null') as { id?: string; seen?: number } | null
      if (existing?.id && existing.id !== tabId && now - Number(existing.seen ?? 0) < 7000) { const timer = setTimeout(() => setDuplicateTab(true), 0); return () => clearTimeout(timer) }
      localStorage.setItem(key, JSON.stringify({ id: tabId, seen: now }))
    } catch { /* Room remains usable when private browsing blocks local storage. */ }
    const heartbeat = setInterval(() => { try { localStorage.setItem(key, JSON.stringify({ id: tabId, seen: Date.now() })) } catch {} }, 2500)
    return () => { clearInterval(heartbeat); try { const current = JSON.parse(localStorage.getItem(key) ?? 'null') as { id?: string } | null; if (current?.id === tabId) localStorage.removeItem(key) } catch {} }
  }, [room.id, room.participantId])
  useEffect(() => { const timer = setInterval(refresh, room.phase === 'complete' ? 10000 : 2000); return () => clearInterval(timer) }, [refresh, room.phase])
  useEffect(() => {
    const timer = setInterval(() => { void mutate({ action: 'presence', mediaReady: !!peer.localStream }, false) }, 12000)
    return () => clearInterval(timer)
  // Presence deliberately follows media state without recreating the interval for every room poll.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peer.localStream, room.id])
  useEffect(() => {
    if (!room.phaseEndsAt) return
    const timer = setInterval(() => setSeconds(remaining(room.phaseEndsAt)), 250)
    return () => clearInterval(timer)
  }, [room.phaseEndsAt])

  const finishRecording = useCallback(async () => {
    if (!activeRecording.current) return
    const current = activeRecording.current; activeRecording.current = null
    try { setRecording(await current.stop()) }
    catch { setError('The local recording stopped unexpectedly. Your live station can continue without it.') }
    finally { mixedDispose.current?.(); mixedDispose.current = null }
  }, [])

  useEffect(() => {
    const shouldRecord = room.recordingEnabled && room.role === 'candidate' && room.phase === 'live_station' && peer.localStream && recordingRevision.current !== room.phaseRevision
    if (shouldRecord) {
      try {
        const mixed = mixedRoomStream(peer.localStream!, peer.remoteStream)
        mixedDispose.current = mixed.dispose
        activeRecording.current = startRecording(prepareRecorders(mixed.stream), () => setError('Recording was interrupted. The live station is still connected.'))
        recordingRevision.current = room.phaseRevision
      } catch { queueMicrotask(() => setError('Recording could not start. The live station is still connected and both people can continue.')) }
    }
    if (room.phase !== 'live_station' && activeRecording.current) void finishRecording()
  }, [finishRecording, peer.localStream, peer.remoteStream, room.phase, room.phaseRevision, room.recordingEnabled, room.role])
  useEffect(() => () => { uploadAbort.current?.abort(); void finishRecording() }, [finishRecording])

  async function mutate(body: Record<string, unknown>, showBusy = true) {
    if (showBusy && busy) return null
    if (showBusy) setBusy(true)
    try {
      const response = await fetch(`/api/interviews/live-rooms/${encodeURIComponent(room.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'The room could not be updated.')
      setRoom(result); setError(''); return result as LiveRoomSnapshot
    } catch (caught) { if (showBusy) { setError(caught instanceof Error ? caught.message : 'The room could not be updated.'); haptic(18) }; return null }
    finally { if (showBusy) setBusy(false) }
  }

  async function prepareMedia() {
    const okay = await peer.prepare()
    if (okay) { await mutate({ action: 'presence', mediaReady: true }, false); haptic(14); await refresh() }
  }
  async function toggleReady() { haptic(12); await mutate({ action: 'ready', ready: !me.ready, recordingConsent: consent }) }
  async function startRoom() { haptic(18); await mutate({ action: 'start' }) }
  async function advance() { haptic(14); await mutate({ action: 'advance' }) }
  async function withdrawRecording() { if (window.confirm('Stop recording for everyone? The live station will continue, but this recording will not be saved.')) { await mutate({ action: 'withdraw_recording' }); haptic(18) } }
  async function submitFeedback() { haptic(15); await mutate({ action: 'feedback', answers }) }

  async function copyInvite() {
    if (!inviteCode) return
    const url = `${window.location.origin}/interviews/live-practice?code=${inviteCode}`
    await navigator.clipboard.writeText(url); setCopied(true); haptic(10); setTimeout(() => setCopied(false), 1600)
  }

  async function saveRecording() {
    if (!recording || saving) return
    setSaving(true); setError(''); uploadAbort.current = new AbortController()
    try {
      if (!shell.current) {
        const response = await fetch('/api/interviews/attempts/initiate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stationId: room.station.id, format: room.station.format, videoType: recording.video.type, audioType: recording.audio?.type ?? null, liveRoomId: room.id }) })
        const result = await response.json(); if (!response.ok) throw new Error(result.error); shell.current = result
      }
      const current = shell.current!
      if (!videoUploaded.current) { setSaveStage('Saving candidate video'); setSaveProgress(0); await uploadInterviewMedia(recording.video, current.videoPath, setSaveProgress, uploadAbort.current.signal); videoUploaded.current = true }
      if (recording.audio && current.audioPath && !audioUploaded.current) { setSaveStage('Saving room audio for transcript'); setSaveProgress(0); await uploadInterviewMedia(recording.audio, current.audioPath, setSaveProgress, uploadAbort.current.signal); audioUploaded.current = true }
      setSaveStage('Finishing private save')
      const response = await finaliseInterviewUpload(current.attemptId, { durationSeconds: recording.durationSeconds, questionEvents: [{ question_index: 0, offset_seconds: 0 }] }, uploadAbort.current.signal)
      const result = await response.json(); if (!response.ok) throw new Error(result.error)
      await mutate({ action: 'recording_saved', attemptId: current.attemptId }, false)
      setRecording(null); haptic(18)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Saving paused. Keep this tab open and retry.') }
    finally { setSaving(false) }
  }

  const isHost = room.hostId === me.userId, canStart = canStartLiveRoom(room.participants, room.recordingEnabled) && peer.status === 'connected'
  const stationIsVisible = room.phase === 'preparation' || room.phase === 'live_station'
  const videoStage = <section className={`${styles.stageCard} ${stationIsVisible ? styles.compactStageCard : ''}`} aria-label="Live video room">
    <div className={styles.videoGrid}>
      <VideoTile label={`${me.displayName} · You`} stream={peer.localStream} videoRef={peer.attachLocalVideo} cameraOff={peer.cameraOff} />
      <VideoTile remote label={peerParticipant ? `${peerParticipant.displayName} · ${capital(peerParticipant.role)}` : 'Waiting for your practice partner'} stream={peer.remoteStream} videoRef={peer.attachRemoteVideo} cameraOff={false} />
    </div>
    <div className={styles.stageDock}><div className={styles.mediaButtons}><button type="button" className={styles.roundButton} data-off={peer.microphoneOff} onClick={peer.toggleMicrophone} aria-label={peer.microphoneOff ? 'Turn microphone on' : 'Mute microphone'}><MicIcon off={peer.microphoneOff} /></button><button type="button" className={styles.roundButton} data-off={peer.cameraOff} onClick={peer.toggleCamera} aria-label={peer.cameraOff ? 'Turn camera on' : 'Turn camera off'}><CameraIcon off={peer.cameraOff} /></button></div><span className={styles.connection} data-connected={peer.status === 'connected'}>{connectionLabel(peer.status, peerParticipant?.displayName)}</span></div>
  </section>
  if (duplicateTab) return <main className={styles.roomPage}><div className={styles.roomShell}><section className={styles.completeCard}><LockIcon /><h2>This room is already open.</h2><p>Return to the other tab to keep the timer, recording and live connection in one place.</p><div className={styles.completeActions}><Link className={styles.secondaryAction} href="/interviews/live-practice">Back to Live Practice</Link></div></section></div></main>
  return <main className={styles.roomPage}><div className={styles.roomShell}>
    <header className={styles.roomHeader}><div><p className={styles.eyebrow}>{room.role === 'candidate' ? 'Candidate room' : 'Examiner room'}</p><h1>{room.station.title}</h1></div><div className={styles.phasePill}><span />{phaseLabel(room.phase)}</div></header>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}

    {room.phase === 'marking' ? <FeedbackPhase room={room} answers={answers} setAnswers={setAnswers} submit={submitFeedback} busy={busy} recording={recording} saving={saving} saveProgress={saveProgress} saveStage={saveStage} saveRecording={saveRecording} />
      : room.phase === 'debrief' ? <Debrief room={room} isHost={isHost} advance={advance} busy={busy} recording={recording} saving={saving} saveProgress={saveProgress} saveStage={saveStage} saveRecording={saveRecording} />
      : room.phase === 'complete' ? <Complete room={room} />
      : stationIsVisible ? <div className={styles.activeWorkspace}>
        <StationFocus room={room} />
        <aside className={styles.liveRail} aria-label="Live session controls">
          {videoStage}
          <div className={styles.sideStack}><SessionControls room={room} seconds={seconds} isHost={isHost} advance={advance} withdrawRecording={withdrawRecording} busy={busy} /></div>
        </aside>
      </div>
      : <div className={styles.roomGrid}>
        {videoStage}
        <div className={styles.sideStack}>
          {room.phase === 'lobby' ? <LobbySide room={room} me={me} inviteCode={inviteCode} copied={copied} copyInvite={copyInvite} consent={consent} setConsent={setConsent} prepareMedia={prepareMedia} mediaReady={!!peer.localStream} toggleReady={toggleReady} startRoom={startRoom} busy={busy} isHost={isHost} canStart={canStart} />
            : <><SessionControls room={room} seconds={seconds} isHost={isHost} advance={advance} withdrawRecording={withdrawRecording} busy={busy} /><section className={styles.sideCard}><h2>Your role: {capital(room.role)}</h2><p>{room.role === 'candidate' ? 'You will receive the station when preparation begins. Answer naturally; this is practice, not a performance.' : 'Listen for reasoning and communication. Keep your private marking guide to yourself until feedback.'}</p></section></>}
        </div>
        {room.phase === 'briefing' ? <Briefing role={room.role} /> : null}
      </div>}
  </div></main>
}

function VideoTile({ label, stream, videoRef, cameraOff, remote = false }: { label: string; stream: MediaStream | null; videoRef: (node: HTMLVideoElement | null) => void; cameraOff: boolean; remote?: boolean }) {
  return <div className={styles.videoTile} data-remote={remote}>{stream && !cameraOff ? <video ref={videoRef} autoPlay muted={!remote} playsInline /> : <div className={styles.videoEmpty}><div><span>{label.slice(0, 1).toUpperCase()}</span><p>{remote ? 'Waiting for live video…' : 'Camera preview is off'}</p></div></div>}<div className={styles.tileLabel}><i />{label}</div></div>
}

function LobbySide({ room, me, inviteCode, copied, copyInvite, consent, setConsent, prepareMedia, mediaReady, toggleReady, startRoom, busy, isHost, canStart }: { room: LiveRoomSnapshot; me: LiveRoomSnapshot['participants'][number]; inviteCode: string; copied: boolean; copyInvite: () => void; consent: boolean; setConsent: (value: boolean) => void; prepareMedia: () => void; mediaReady: boolean; toggleReady: () => void; startRoom: () => void; busy: boolean; isHost: boolean; canStart: boolean }) {
  return <><section className={styles.sideCard}><h2>Your private room</h2><p>Only people with this invite can enter. This first release supports one candidate and one examiner.</p>{isHost && <div className={styles.inviteBox}>{inviteCode ? <><code>{inviteCode}</code><div className={styles.inviteActions}><button onClick={copyInvite}>{copied ? 'Invite copied' : 'Copy invite link'}</button></div></> : <p>Invite details are available in the tab where this room was created.</p>}</div>}<div className={styles.participantList}>{room.participants.filter(item => !item.leftAt).map(item => <div key={item.id} className={styles.participant}><span className={styles.participantAvatar}>{item.displayName.slice(0, 1).toUpperCase()}</span><p><strong>{item.displayName}{item.id === me.id ? ' · You' : ''}</strong><small>{capital(item.role)} · {item.mediaReady ? 'Media checked' : 'Needs media check'}</small></p><span className={styles.participantStatus} data-ready={item.ready} title={item.ready ? 'Ready' : 'Not ready'} /></div>)}</div></section>
    <section className={styles.sideCard}><h2>Ready check</h2><p>The prompt is still hidden. Check your camera and microphone first.</p>{room.recordingEnabled ? <label className={styles.consent}><input type="checkbox" checked={consent} disabled={me.ready} onChange={event => setConsent(event.target.checked)} /><span><strong>I consent to recording.</strong><br/>The candidate controls the saved recording. I can withdraw before the room starts.</span></label> : <p className={styles.consent}>This room will not be recorded.</p>}<div className={styles.roomActions}>{!mediaReady ? <button className={styles.primaryAction} onClick={prepareMedia}>Check camera &amp; microphone</button> : <button className={styles.secondaryAction} onClick={prepareMedia}>Check media again</button>}<button className={me.ready ? styles.secondaryAction : styles.primaryAction} disabled={!mediaReady || (room.recordingEnabled && !consent) || busy} onClick={toggleReady}>{me.ready ? 'I’m not ready' : 'I’m ready'}</button>{isHost ? <button className={styles.primaryAction} disabled={!canStart || busy} onClick={startRoom}>Start station <ArrowIcon /></button> : null}</div><p className={styles.readinessHint}>{isHost ? (canStart ? 'Everything is ready. Start whenever you both agree.' : 'The start button unlocks when both people are connected and ready.') : 'The candidate is hosting this room and will start the shared timer.'}</p></section></>
}

function SessionControls({ room, seconds, isHost, advance, withdrawRecording, busy }: { room: LiveRoomSnapshot; seconds: number; isHost: boolean; advance: () => void; withdrawRecording: () => void; busy: boolean }) {
  const phase = room.phase
  return <><section className={styles.timerCard}><small>{phaseLabel(phase)}</small><div className={styles.timer}>{formatTime(seconds)}</div><p>{phase === 'live_station' && room.recordingEnabled ? '● Recording is on' : phase === 'preparation' ? 'Recording has not started' : 'Shared server timer'}</p></section>
    {room.recordingEnabled && ['preparation','live_station'].includes(phase) ? <button className={styles.dangerAction} disabled={busy} onClick={withdrawRecording}>Stop recording</button> : null}
    {isHost && phase !== 'briefing' ? <button className={styles.secondaryAction} disabled={busy} onClick={advance}>{phase === 'live_station' ? 'End station' : 'Move forward'} <ArrowIcon /></button> : null}</>
}

function StationFocus({ room }: { room: LiveRoomSnapshot }) {
  const isPreparation = room.phase === 'preparation'
  return <section className={styles.stationFocus} aria-labelledby="live-station-title" data-phase={room.phase}>
    <div className={styles.stationFocusHeader}>
      <div><p className={styles.eyebrow}>{isPreparation ? 'Read the scenario' : 'Your live station'}</p><h2 id="live-station-title">{room.station.title}</h2></div>
      <span className={styles.stationPhase}>{isPreparation ? 'Prepare' : 'Respond'}</span>
    </div>
    {!isPreparation ? <div className={styles.questionBlock}><p className={styles.contentLabel}>{room.station.questions.length === 1 ? 'Question' : 'Questions'}</p><ol className={styles.focusQuestionList}>{room.station.questions.map((question, index) => <li key={question}><span>{index + 1}</span><p>{question}</p></li>)}</ol></div> : null}
    <div className={styles.scenarioBlock}><p className={styles.contentLabel}>Scenario</p><p className={styles.scenarioText}>{room.station.preparation}</p></div>
    {isPreparation ? <p className={styles.questionPending}><LockIcon /> The question appears when the live response begins.</p> : null}
  </section>
}

function Briefing({ role }: { role: 'candidate' | 'examiner' }) {
  return <section className={styles.briefCard}><div><p className={styles.eyebrow}>Private briefing</p><h2>{role === 'candidate' ? 'Stay present. The prompt comes next.' : 'Observe, then make your feedback useful.'}</h2><p>{role === 'candidate' ? 'Use the preparation time to identify the people, priorities and first safe action.' : 'Take short evidence notes during the station. Do not coach, reveal prompts or interrupt unless the station asks you to.'}</p></div><div className={styles.briefIcon}><LockIcon /></div><div className={styles.briefBody}><h3>{role === 'candidate' ? 'Candidate focus' : 'Examiner focus'}</h3><p>{role === 'candidate' ? 'You do not need a memorised speech. Give a clear position, explain your reasoning and communicate with respect.' : 'Mark what you actually hear. One precise example and one achievable next step are more useful than a vague score.'}</p></div></section>
}

function FeedbackPhase({ room, answers, setAnswers, submit, busy, recording, saving, saveProgress, saveStage, saveRecording }: { room: LiveRoomSnapshot; answers: Record<string, number | string>; setAnswers: (value: Record<string, number | string>) => void; submit: () => void; busy: boolean; recording: LocalRecording | null; saving: boolean; saveProgress: number; saveStage: string; saveRecording: () => void }) {
  const own = room.feedback.find(item => item.participantId === room.participantId), fields = LIVE_FEEDBACK_FIELDS[room.role]
  return <div className={styles.feedbackLayout}><section className={styles.feedbackCard}><p className={styles.eyebrow}>{room.role === 'candidate' ? 'Private reflection' : 'Examiner feedback'}</p><h2>{own?.submittedAt ? 'Your feedback is saved.' : room.role === 'candidate' ? 'Reflect before seeing your examiner’s view.' : 'Make the next attempt easier to improve.'}</h2><p>Your answers stay private until both people submit.</p>{own?.submittedAt ? <div className={styles.waitingCard}><div><Cyto mood="thinking" size={82} /><p>Waiting for the other person. Their feedback cannot change what you have already written.</p><div className={styles.waitingDots}><span/><span/><span/></div></div></div> : <div className={styles.feedbackFields}>{fields.map(field => 'low' in field ? <label key={field.key} className={styles.ratingField}><span>{field.label}</span><div className={styles.ratingScale}>{[1,2,3,4,5].map(value => <button type="button" key={value} aria-pressed={answers[field.key] === value} onClick={() => setAnswers({ ...answers, [field.key]: value })}>{value}</button>)}</div><small className={styles.ratingEnds}><span>{field.low}</span><span>{field.high}</span></small></label> : <label key={field.key} className={styles.textField}><span>{field.label}</span><textarea maxLength={600} placeholder={field.placeholder} value={String(answers[field.key] ?? '')} onChange={event => setAnswers({ ...answers, [field.key]: event.target.value })} /></label>)}<button className={styles.primaryAction} disabled={busy} onClick={submit}>Submit privately <ArrowIcon /></button></div>}</section><section className={styles.sideCard}><h2>{room.recordingEnabled ? 'Candidate-owned recording' : 'No recording'}</h2>{room.recordingEnabled ? room.role === 'candidate' ? <><p>{room.recordingAttemptId ? 'The recording is saved privately. Its transcript will appear with your recordings.' : recording ? 'Your recording is held in this tab until you save it.' : 'Finishing the local recording…'}</p>{recording && !room.recordingAttemptId ? <button className={styles.primaryAction} disabled={saving} onClick={saveRecording}>{saving ? `${saveStage} · ${saveProgress}%` : 'Save recording & transcript'}</button> : null}</> : <p>The candidate controls whether the consensual recording is retained, deleted or shared.</p> : <p>This station was intentionally unrecorded. You can still save the structured feedback.</p>}</section></div>
}

function Debrief({ room, isHost, advance, busy, recording, saving, saveProgress, saveStage, saveRecording }: { room: LiveRoomSnapshot; isHost: boolean; advance: () => void; busy: boolean; recording: LocalRecording | null; saving: boolean; saveProgress: number; saveStage: string; saveRecording: () => void }) {
  return <section className={styles.debriefCard}><p className={styles.eyebrow}>Shared debrief</p><h2>Compare the evidence, then choose one next focus.</h2><p>These are practice perspectives, not an admissions score. Different roles answer different questions, so the ratings are not averaged.</p><div className={styles.debriefGrid}>{room.feedback.map(item => <FeedbackSummary key={item.participantId} role={item.role} answers={item.answers} />)}</div><div className={styles.completeActions}>{room.role === 'candidate' && recording && !room.recordingAttemptId ? <button className={styles.secondaryAction} disabled={saving} onClick={saveRecording}>{saving ? `${saveStage} · ${saveProgress}%` : 'Save room recording'}</button> : null}{isHost ? <button className={styles.primaryAction} disabled={busy || (room.recordingEnabled && room.role === 'candidate' && !!recording && !room.recordingAttemptId)} onClick={advance}>Complete room <ArrowIcon /></button> : <p>Waiting for the host to complete the room.</p>}</div></section>
}

function FeedbackSummary({ role, answers }: { role: 'candidate' | 'examiner'; answers: Record<string, number | string> }) {
  const labels: Record<string,string> = { confidence: 'Confidence', structure: 'Structure', nextFocus: 'Candidate’s next focus', reasoning: 'Reasoning & judgement', communication: 'Communication & empathy', evidence: 'Evidence noticed', nextStep: 'Examiner’s next step' }
  return <article className={styles.feedbackSummary}><h3>{role === 'candidate' ? 'Candidate reflection' : 'Examiner perspective'}</h3><dl>{Object.entries(answers).map(([key,value]) => <div key={key}><dt>{labels[key] ?? key}</dt><dd>{typeof value === 'number' ? `${value} / 5` : value}</dd></div>)}</dl></article>
}

function Complete({ room }: { room: LiveRoomSnapshot }) {
  return <section className={styles.completeCard}><CheckIcon /><h2>Room complete.</h2><p>{room.recordingAttemptId ? 'The candidate’s private recording is saved and the transcript is being prepared.' : 'Your structured reflection and peer feedback are safely attached to this practice room.'}</p><div className={styles.completeActions}><Link className={styles.primaryAction} href="/interviews/live-practice">Practise together again</Link>{room.role === 'candidate' && room.recordingAttemptId ? <Link className={styles.secondaryAction} href={`/interviews/mock-interviews/review?attempt=${room.recordingAttemptId}`}>Open saved recording</Link> : <Link className={styles.secondaryAction} href="/interviews">Back to dashboard</Link>}</div></section>
}

function mixedRoomStream(local: MediaStream, remote: MediaStream | null) {
  const audioContext = new AudioContext(), destination = audioContext.createMediaStreamDestination()
  for (const source of [local, remote]) if (source?.getAudioTracks().length) audioContext.createMediaStreamSource(new MediaStream(source.getAudioTracks())).connect(destination)
  const stream = new MediaStream([...local.getVideoTracks(), ...destination.stream.getAudioTracks()])
  return { stream, dispose: () => { stream.getAudioTracks().forEach(track => track.stop()); void audioContext.close() } }
}
function remaining(value: string | null) { return value ? Math.max(0, Math.ceil((Date.parse(value) - Date.now()) / 1000)) : 0 }
function formatTime(value: number) { return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}` }
function capital(value: string) { return value.slice(0, 1).toUpperCase() + value.slice(1) }
function connectionLabel(status: string, name?: string) { if (!name) return 'Waiting for someone to join'; if (status === 'connected') return `Connected to ${name}`; if (status === 'interrupted') return 'Connection interrupted · retrying'; if (status === 'connecting') return 'Connecting live video…'; return 'Complete your media check' }

const icon = { viewBox:'0 0 24 24',fill:'none',width:20,height:20,stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true }
function ArrowIcon(){return <svg {...icon}><path d="M5 12h14m-5-5 5 5-5 5"/></svg>}
function LockIcon(){return <svg {...icon} width="28" height="28"><rect x="5" y="10" width="14" height="10" rx="3"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10"/></svg>}
function MicIcon({off}:{off:boolean}){return <svg {...icon}><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0m-7 7v3M8 21h8"/>{off&&<path d="M4 4l16 16"/>}</svg>}
function CameraIcon({off}:{off:boolean}){return <svg {...icon}><rect x="3" y="6" width="12" height="12" rx="3"/><path d="m15 10 6-3v10l-6-3"/>{off&&<path d="M4 4l16 16"/>}</svg>}
function CheckIcon(){return <svg {...icon} width="48" height="48"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16.5 9"/></svg>}
