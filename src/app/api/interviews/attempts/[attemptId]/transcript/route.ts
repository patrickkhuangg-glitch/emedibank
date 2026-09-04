import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/dal'
import { transcribeInterviewRecording } from '@/lib/interviews/transcription'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  const { attemptId } = await params
  const supabase = await createClient()
  const { data: attempt } = await supabase
    .from('interview_attempts')
    .select('id, recording_path, recording_mime_type, transcript, transcription_status')
    .eq('id', attemptId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!attempt) return NextResponse.json({ error: 'Recording not found.' }, { status: 404 })
  if (attempt.transcription_status === 'ready' && attempt.transcript) return NextResponse.json({ transcript: attempt.transcript, status: 'ready' })

  await supabase
    .from('interview_attempts')
    .update({ transcription_status: 'processing' })
    .eq('id', attempt.id)

  const { data: audio, error: downloadError } = await supabase.storage
    .from('interview-recordings')
    .download(attempt.recording_path)

  if (downloadError || !audio) return failTranscript(supabase, attempt.id)

  const result = await transcribeInterviewRecording(audio, attempt.recording_mime_type, 'interview-response.webm')
  if ('error' in result || !result.text) return failTranscript(supabase, attempt.id)

  const { error: updateError } = await supabase
    .from('interview_attempts')
    .update({ transcript: result.text, transcription_status: 'ready', transcription_model: 'gpt-4o-mini-transcribe' })
    .eq('id', attempt.id)

  if (updateError) return NextResponse.json({ error: 'The transcript could not be saved. Please try again.' }, { status: 503 })
  return NextResponse.json({ transcript: result.text, status: 'ready' })
}

async function failTranscript(supabase: Awaited<ReturnType<typeof createClient>>, attemptId: string) {
  await supabase.from('interview_attempts').update({ transcription_status: 'failed' }).eq('id', attemptId)
  return NextResponse.json({ error: 'The transcript could not be created. Please try again.' }, { status: 503 })
}
