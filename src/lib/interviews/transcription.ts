import 'server-only'
import { formatSpeakerTranscript, isDiarizedTranscript } from './speaker-transcript'

type TranscriptResult = { text: string; requestId?: string; model: string } | { error: string }

export async function transcribeInterviewRecording(audio: Blob, mimeType: string, fileName: string, options: { diarize?: boolean } = {}): Promise<TranscriptResult> {
  const apiKey = process.env.OPENAI_TRANSCRIPTION_API_KEY
  if (!apiKey) return { error: 'Transcription is not configured yet.' }

  const formData = new FormData()
  const model = options.diarize
    ? process.env.OPENAI_INTERVIEW_DIARIZATION_MODEL || 'gpt-4o-transcribe-diarize'
    : process.env.OPENAI_INTERVIEW_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe'
  formData.set('model', model)
  formData.set('file', new File([audio], fileName, { type: mimeType || 'audio/webm' }))
  if (options.diarize) {
    formData.set('response_format', 'diarized_json')
    formData.set('chunking_strategy', 'auto')
  }

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
      signal: AbortSignal.timeout(65000),
    })
    const payload: unknown = await response.json().catch(() => null)
    if (!response.ok) return { error: 'The transcript could not be created. Please try again.' }
    const text = options.diarize
      ? isDiarizedTranscript(payload) ? formatSpeakerTranscript(payload.segments) : ''
      : isTranscript(payload) ? payload.text.trim() : ''
    if (!text) return { error: 'The transcript could not be created. Please try again.' }
    return { text, model, requestId: response.headers.get('x-request-id') ?? undefined }
  } catch {
    return { error: 'The transcript could not be created. Please try again.' }
  }
}

function isTranscript(value: unknown): value is { text: string } {
  return typeof value === 'object' && value !== null && 'text' in value && typeof value.text === 'string'
}
