import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('interview_study_notes')
    .select('id, body, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Study notes are not ready yet.' }, { status: 503 })
  return NextResponse.json({ notes: data })
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })

  const payload: unknown = await request.json().catch(() => null)
  const body = typeof payload === 'object' && payload && 'body' in payload && typeof payload.body === 'string' ? payload.body.trim() : ''
  if (!body || body.length > 280) return NextResponse.json({ error: 'Write a note between 1 and 280 characters.' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('interview_study_notes')
    .insert({ user_id: user.id, body })
    .select('id, body, created_at')
    .single()

  if (error) return NextResponse.json({ error: 'Your note could not be saved. Try again.' }, { status: 503 })
  return NextResponse.json({ note: data }, { status: 201 })
}
