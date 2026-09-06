import 'server-only'

type TranscriptResult = { text: string; requestId?: string; model: string } | { error: string }

export async function transcribeInterviewRecording(audio: Blob, mimeType: string, fileName: string): Promise<TranscriptResult> {
  const apiKey = process.env.OPENAI_TRANSCRIPTION_API_KEY
  if (!apiKey) return { error: 'Transcription is not configured yet.' }

  const formData = new FormData()
  const model = process.env.OPENAI_INTERVIEW_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe'
  formData.set('model', model)
  formData.set('file', new File([audio], fileName, { type: mimeType || 'audio/webm' }))

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
      signal: AbortSignal.timeout(65000),
    })
    const payload: unknown = await response.json().catch(() => null)
    if (!response.ok || !isTranscript(payload)) return { error: 'The transcript could not be created. Please try again.' }
    return { text: payload.text.trim(), model, requestId: response.headers.get('x-request-id') ?? undefined }
  } catch {
    return { error: 'The transcript could not be created. Please try again.' }
  }
}

function isTranscript(value: unknown): value is { text: string } {
  return typeof value === 'object' && value !== null && 'text' in value && typeof value.text === 'string'
}
