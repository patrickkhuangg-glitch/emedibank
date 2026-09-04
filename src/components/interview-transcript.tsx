'use client'

import { useState } from 'react'

type TranscriptStatus = 'not_requested' | 'processing' | 'ready' | 'failed'

export function InterviewTranscript({ attemptId, initialStatus, initialTranscript }: { attemptId: string; initialStatus: TranscriptStatus; initialTranscript: string | null }) {
  const [status, setStatus] = useState<TranscriptStatus>(initialStatus)
  const [transcript, setTranscript] = useState(initialTranscript)
  const [error, setError] = useState('')

  async function createTranscript() {
    setStatus('processing')
    setError('')
    try {
      const response = await fetch(`/api/interviews/attempts/${attemptId}/transcript`, { method: 'POST' })
      const payload = await response.json()
      if (!response.ok || typeof payload.transcript !== 'string') throw new Error(payload.error || 'The transcript could not be created. Please try again.')
      setTranscript(payload.transcript)
      setStatus('ready')
    } catch (requestError) {
      setStatus('failed')
      setError(requestError instanceof Error ? requestError.message : 'The transcript could not be created. Please try again.')
    }
  }

  if (status === 'ready' && transcript) return <section className="mt-7 border-t border-border pt-6"><h3 className="font-display text-xl font-semibold tracking-tight">Transcript</h3><p className="mt-2 text-sm leading-6 text-muted">A private transcript of this recording. Review it with the audio—it may contain minor transcription errors.</p><p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-foreground">{transcript}</p></section>

  if (status === 'processing') return <section className="mt-7 border-t border-border pt-6"><h3 className="font-display text-xl font-semibold tracking-tight">Transcript</h3><p className="mt-2 text-sm leading-6 text-muted">Your transcript is being prepared automatically. Refresh this page in a moment if it is not ready yet.</p></section>

  const isHistoricAttempt = status === 'not_requested'
  return <section className="mt-7 border-t border-border pt-6"><h3 className="font-display text-xl font-semibold tracking-tight">Transcript</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{isHistoricAttempt ? 'This recording was saved before automatic transcripts were available.' : 'The transcript could not be prepared automatically.'} You can create one now to review your wording.</p><button type="button" onClick={createTranscript} className="eb-press mt-5 inline-flex rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground">{isHistoricAttempt ? 'Create transcript' : 'Retry transcript'}</button>{error ? <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}</section>
}
