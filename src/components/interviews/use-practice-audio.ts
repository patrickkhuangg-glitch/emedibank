'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AUDIO_CAPTURE_CONSTRAINTS, prepareAudioRecording } from '@/lib/interviews/audio-recording'
import { mediaExtension, type QuestionEvent } from '@/lib/interviews/media-validation'
import { uploadInterviewMedia } from '@/lib/interviews/video-upload'
import type { InterviewStation } from '@/lib/interviews/stations'

export function usePracticeAudio(station: InterviewStation) {
  const recorder = useRef<ReturnType<typeof prepareAudioRecording> | null>(null)
  const generation = useRef(0), busy = useRef(false), blob = useRef<Blob | null>(null), attempt = useRef<string | null>(null), path = useRef<string | null>(null), uploaded = useRef(false), abort = useRef<AbortController | null>(null)
  const [extension, setExtension] = useState('webm')
  const [url, setUrl] = useState(''), [error, setError] = useState(''), [saving, setSaving] = useState(false), [stopping, setStopping] = useState(false), [progress, setProgress] = useState(0), [savedId, setSavedId] = useState<string | null>(null)
  useEffect(() => () => { generation.current++; recorder.current?.dispose(); abort.current?.abort() }, [])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  const reset = useCallback(async () => {
    if (attempt.current && !savedId) {
      try {
        const response = await fetch(`/api/interviews/attempts/${attempt.current}`, {method:'DELETE'})
        if (!response.ok && response.status !== 404) throw new Error()
      } catch { setError('The previous upload could not be discarded. Your audio is still here; retry before starting again.'); return false }
    }
    generation.current++; recorder.current?.dispose(); recorder.current = null
    blob.current = null; attempt.current = null; path.current = null; uploaded.current = false
    setUrl(''); setError(''); setSavedId(null); setProgress(0)
    return true
  }, [savedId])
  const prepare = useCallback(async () => {
    setError('')
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Microphone recording needs a secure page in a current Chrome, Safari or Edge browser. You can still practise without recording.')
    const current = generation.current
    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia(AUDIO_CAPTURE_CONSTRAINTS)
      if (current !== generation.current) { stream.getTracks().forEach(track => track.stop()); return false }
      recorder.current = prepareAudioRecording(stream, () => setError('The microphone stopped unexpectedly. End practice and try again.'))
      return true
    } catch {
      stream?.getTracks().forEach(track => track.stop())
      throw new Error('The microphone could not start. Check microphone permissions, or practise without recording.')
    }
  }, [])
  const start = useCallback(() => {
    try { if (!recorder.current) throw new Error(); recorder.current.start(); return true }
    catch { recorder.current?.dispose(); setError('Audio recording could not start. Please try again.'); return false }
  }, [])
  const finish = useCallback(async () => {
    const current = generation.current
    setStopping(true)
    try {
      const audio = await recorder.current?.stop()
      if (current !== generation.current) return
      if (audio) { blob.current = audio; setExtension(mediaExtension(audio.type, 'audio')); setUrl(URL.createObjectURL(audio)) }
    } catch (e) { if (current === generation.current) setError(e instanceof Error ? e.message : 'Recording could not finish. Please try again.') }
    finally { if (current === generation.current) setStopping(false) }
  }, [])
  async function save(durationSeconds: number, questionEvents: QuestionEvent[]) {
    if (!blob.current || busy.current || savedId) return
    busy.current = true; setSaving(true); setError(''); abort.current = new AbortController()
    try {
      attempt.current ??= crypto.randomUUID()
      if (!path.current) {
        const r = await fetch('/api/interviews/practice/recordings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: attempt.current, format: station.format, stationId: station.id, audioType: blob.current.type }), signal: abort.current.signal })
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Saving could not start. Please retry.')
        path.current = data.audioPath
      }
      if (!uploaded.current) { await uploadInterviewMedia(blob.current, path.current!, setProgress, abort.current.signal); uploaded.current = true }
      const r = await fetch(`/api/interviews/attempts/${attempt.current}/finalise`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ durationSeconds, questionEvents }), signal: abort.current.signal })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Your audio uploaded, but saving could not finish. Retry safely.')
      setSavedId(attempt.current)
    } catch (e) { setError(abort.current.signal.aborted ? 'Saving paused. Your audio is kept in this tab; select Save audio & transcribe to resume.' : e instanceof Error ? e.message : 'Saving failed. Your audio is kept in this tab; retry saving.') }
    finally { busy.current = false; setSaving(false) }
  }
  return { prepare, start, finish, reset, save, pause: () => abort.current?.abort(), url, error, saving, stopping, progress, savedId, extension }
}
