import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/dal'
import { getInterviewStation, type InterviewFormat } from '@/lib/interviews/stations'
import { createClient } from '@/lib/supabase/server'

const MAX_AUDIO_BYTES = 32 * 1024 * 1024

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  const formData = await request.formData()
  const audio = formData.get('audio')
  const format: InterviewFormat = formData.get('format') === 'panel' ? 'panel' : 'mmi'
  const station = getInterviewStation(format, stringValue(formData.get('stationId')))
  const durationSeconds = Math.max(0, Math.min(480, Number(stringValue(formData.get('durationSeconds'))) || 0))

  if (!(audio instanceof File) || audio.size === 0 || audio.size > MAX_AUDIO_BYTES || !audio.type.startsWith('audio/')) {
    return NextResponse.json({ error: 'Please provide an audio recording under 32 MB.' }, { status: 400 })
  }

  const extension = audio.type.includes('ogg') ? 'ogg' : 'webm'
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`
  const supabase = await createClient()
  const { error: uploadError } = await supabase.storage.from('interview-recordings').upload(path, audio, {
    contentType: audio.type,
    upsert: false,
  })
  if (uploadError) return NextResponse.json({ error: 'Audio storage is not ready yet.' }, { status: 503 })

  const { error: insertError } = await supabase.from('interview_attempts').insert({
    user_id: user.id,
    format,
    station_id: station.id,
    station_title: station.title,
    questions: station.questions,
    duration_seconds: durationSeconds,
    recording_path: path,
    recording_mime_type: audio.type,
  })
  if (insertError) {
    await supabase.storage.from('interview-recordings').remove([path])
    return NextResponse.json({ error: 'Recording history is not ready yet.' }, { status: 503 })
  }

  return NextResponse.json({ ok: true })
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : ''
}
