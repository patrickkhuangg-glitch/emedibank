'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Cyto } from '@/components/ui/cyto'
import { haptic } from '@/lib/haptics'
import { normaliseInviteCode, type LiveRoomHistoryItem } from '@/lib/interviews/live-practice'
import { categoryTopics, promptFocus } from '@/lib/interviews/selection-context'
import styles from './live-practice.module.css'

type StationOption = { id: string; format: 'mmi' | 'panel'; title: string; category: string; preparation: string; questions: string[] }

export function LivePracticeEntry({ stations, initialCode, recent }: { stations: StationOption[]; initialCode: string; recent: LiveRoomHistoryItem[] }) {
  const router = useRouter()
  const [mode, setMode] = useState<'create' | 'join'>(initialCode ? 'join' : 'create')
  const [format, setFormat] = useState<'mmi' | 'panel'>(stations.some(item => item.format === 'mmi') ? 'mmi' : 'panel')
  const matching = useMemo(() => stations.filter(item => item.format === format), [format, stations])
  const [stationId, setStationId] = useState(() => matching[0]?.id ?? '')
  const selected = matching.find(item => item.id === stationId) ?? matching[0]
  const [questionIndex, setQuestionIndex] = useState(0)
  const [recordingEnabled, setRecordingEnabled] = useState(true)
  const [code, setCode] = useState(normaliseInviteCode(initialCode))
  const [busy, setBusy] = useState(false), [error, setError] = useState('')

  function switchMode(next: 'create' | 'join') { haptic(7); setMode(next); setError('') }
  function switchFormat(next: 'mmi' | 'panel') { haptic(7); setFormat(next); setStationId(stations.find(item => item.format === next)?.id ?? ''); setQuestionIndex(0) }

  async function submit() {
    if (busy) return
    setBusy(true); setError(''); haptic(12)
    try {
      const response = await fetch('/api/interviews/live-rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mode === 'create'
        ? { action: 'create', stationId: selected?.id, questionIndex, recordingEnabled }
        : { action: 'join', code }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'The room could not be opened.')
      if (result.inviteCode) sessionStorage.setItem(`live-room:${result.roomId}:invite`, result.inviteCode)
      haptic(18)
      router.push(`/interviews/live-practice/${encodeURIComponent(result.roomId)}`)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The room could not be opened.'); haptic(20) }
    finally { setBusy(false) }
  }

  return <main className={styles.entryPage}><div className="page-frame page-shell">
    <header className={styles.entryHero}>
      <div><p className={styles.eyebrow}>Live Practice</p><h1 className="page-title">Practise with a real person.</h1><p className={styles.lead}>Create a private room for a focused candidate-and-examiner station. The timer, roles and feedback stay in sync.</p></div>
      <div className={styles.cytoIntro}><Cyto mood="thinking" size={104} title="Cyto holding a very organised live-practice checklist" /><p><strong>Cyto checked the room twice.</strong><span>Private invite. Clear roles. No prompt spoilers.</span></p></div>
    </header>

    <div data-interview-tour="live-connect" className={styles.modeSwitch} role="tablist" aria-label="Live practice setup">
      <button role="tab" aria-selected={mode === 'create'} onClick={() => switchMode('create')}>Create a room</button>
      <button role="tab" aria-selected={mode === 'join'} onClick={() => switchMode('join')}>Join with a code</button>
    </div>

    {mode === 'create' ? <section className={styles.entryGrid}>
      <div data-interview-tour="live-station" className={styles.setupPanel}>
        <div className={styles.stepHeading}><span>01</span><div><h2>Choose the station</h2><p>Your examiner will only see private guidance when the relevant phase begins.</p></div></div>
        <div className={styles.formatSwitch} role="group" aria-label="Interview format"><button aria-pressed={format === 'mmi'} onClick={() => switchFormat('mmi')}>MMI station</button><button aria-pressed={format === 'panel'} onClick={() => switchFormat('panel')}>Panel question</button></div>
        <label className={styles.field}><span>{format === 'mmi' ? 'Station' : 'Theme'}</span><select value={selected?.id ?? ''} onChange={event => { setStationId(event.target.value); setQuestionIndex(0) }}>{matching.map(item => <option key={item.id} value={item.id}>{item.title} · {item.category}</option>)}</select></label>
        {format === 'panel' && selected && selected.questions.length > 1 ? <label className={styles.field}><span>Question</span><select value={questionIndex} onChange={event => setQuestionIndex(Number(event.target.value))}>{selected.questions.map((question, index) => <option key={index} value={index}>Question {index + 1} · {promptFocus(question)}</option>)}</select></label> : null}
        {selected ? <div className={styles.selectionContext} aria-live="polite"><span>Theme</span><strong>{selected.title}</strong><p>{format === 'panel' ? selected.preparation : `A scenario exploring ${categoryTopics(selected.category).join(' and ').toLowerCase()}.`}</p><div><small>{selected.category}</small>{format === 'panel' ? <small>Prompt focus · {promptFocus(selected.questions[questionIndex] ?? '')}</small> : null}</div></div> : null}
      </div>
      <div data-interview-tour="live-room" className={styles.setupPanel}>
        <div className={styles.stepHeading}><span>02</span><div><h2>Set the room rules</h2><p>Two separate Studocyte accounts are required.</p></div></div>
        <label className={styles.recordingChoice}><input type="checkbox" checked={recordingEnabled} onChange={event => setRecordingEnabled(event.target.checked)} /><span><strong>Record this station</strong><small>Both people must actively consent. The candidate controls the saved recording.</small></span></label>
        <div className={styles.ruleList}><p><LockIcon /> Private six-character invite</p><p><VideoIcon /> Camera and microphone check</p><p><FeedbackIcon /> Independent feedback before debrief</p></div>
        <button className={styles.primaryAction} disabled={busy || !selected} onClick={submit}>{busy ? 'Creating room…' : 'Create private room'} <ArrowIcon /></button>
      </div>
    </section> : <section className={styles.joinPanel}>
      <div className={styles.joinGraphic}><span><PeopleIcon /></span><Cyto mood="happy" size={86} /></div>
      <div><p className={styles.eyebrow}>Private invite</p><h2>Enter the room code</h2><p>The host will see you arrive, then both of you can check media and choose when to begin.</p>
        <label className={styles.codeField}><span>Six-character code</span><input autoFocus autoCapitalize="characters" autoComplete="off" maxLength={7} value={code} onChange={event => setCode(normaliseInviteCode(event.target.value))} placeholder="CYTO24" /></label>
        <button className={styles.primaryAction} disabled={busy || code.length !== 6} onClick={submit}>{busy ? 'Joining…' : 'Join practice room'} <ArrowIcon /></button>
      </div>
    </section>}
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    {recent.length ? <section className={styles.recentRooms}><div><p className={styles.eyebrow}>Your rooms</p><h2>Recent live practice</h2></div><div className={styles.recentList}>{recent.map(item => <a key={item.id} href={`/interviews/live-practice/${item.id}`}><span className={styles.recentMark}><PeopleIcon /></span><span><strong>{item.title}</strong><small>{capital(item.role)} · {friendlyPhase(item.phase)} · {new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short'}).format(new Date(item.createdAt))}</small></span><ArrowIcon /></a>)}</div></section> : null}
  </div></main>
}

function capital(value:string){return value.slice(0,1).toUpperCase()+value.slice(1)}
function friendlyPhase(value:string){return ({live_station:'Live station',marking:'Feedback',complete:'Complete'} as Record<string,string>)[value] ?? capital(value)}

const icon = { viewBox: '0 0 24 24', fill: 'none', width: 20, height: 20, stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
function ArrowIcon() { return <svg {...icon}><path d="M5 12h14m-5-5 5 5-5 5" /></svg> }
function LockIcon() { return <svg {...icon}><rect x="5" y="10" width="14" height="10" rx="3"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10"/></svg> }
function VideoIcon() { return <svg {...icon}><rect x="3" y="6" width="12" height="12" rx="3"/><path d="m15 10 6-3v10l-6-3"/></svg> }
function FeedbackIcon() { return <svg {...icon}><path d="M4 5h16v12H8l-4 3V5Z"/><path d="M8 9h8m-8 4h5"/></svg> }
function PeopleIcon() { return <svg {...icon} width="34" height="34"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0m1-9a3 3 0 0 0 0-6m1 10a5 5 0 0 1 4 5"/></svg> }
