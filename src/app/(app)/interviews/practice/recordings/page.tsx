import Link from 'next/link'
import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { reviewLibrary, formatRecordingDate, type ReviewResponse } from '@/lib/interviews/review-library'
import { InterviewLibraryRefresh } from '@/components/interviews/library-refresh'
import { InterviewMediaPlayer } from '@/components/interviews/media-player'
import { InterviewTranscript } from '@/components/interview-transcript'
import { InterviewSelfRating } from '@/components/interviews/self-rating'
import { InterviewStudentActions } from '@/components/interviews/student-actions'
import { InterviewStudyNotes } from '@/components/interview-study-notes'
import type { QuestionEvent } from '@/lib/interviews/media-validation'

export const metadata: Metadata = { title: 'Practice recordings & transcripts' }
export const dynamic = 'force-dynamic'
const base = '/interviews/practice/recordings'
const control = 'min-h-11 rounded-full border border-border bg-surface px-4 py-2 text-sm'
export default async function PracticeRecordingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser(base), db = await createClient(), params = await searchParams
  const q = typeof params.q === 'string' ? params.q.slice(0, 150) : '', page = typeof params.page === 'string' ? params.page : undefined
  const id = typeof params.attempt === 'string' ? params.attempt : undefined
  const { data: rows, error } = await db.from('interview_attempts').select('id,format,station_title,created_at,duration_seconds,upload_status,video_deleted_at').eq('user_id', user.id).eq('media_kind', 'audio').order('created_at', { ascending: false })
  const responses: ReviewResponse[] = (rows ?? []).map(row => ({ id: row.id, format: row.format, title: row.station_title, createdAt: row.created_at, duration: row.duration_seconds, mock: null, status: row.upload_status === 'ready' && !row.video_deleted_at ? 'saved' : 'unavailable', eligible: false }))
  const library = reviewLibrary(responses, { q, page })
  const href = (changes: { page?: number; attempt?: string } = {}) => {
    const query = new URLSearchParams()
    if (q) query.set('q', q)
    if (changes.page) query.set('page', String(changes.page))
    if (changes.attempt) query.set('attempt', changes.attempt)
    return `${base}${query.size ? '?' + query : ''}`
  }
  const { data: selected } = id && responses.some(row => row.id === id) ? await db.from('interview_attempts').select('id,format,station_title,created_at,duration_seconds,upload_status,video_deleted_at,recording_path,question_events,transcription_status,transcript').eq('id', id).eq('user_id', user.id).eq('media_kind', 'audio').maybeSingle() : { data: null }
  const [{ data: media }, { data: activity }] = selected ? await Promise.all([
    selected.upload_status === 'ready' && !selected.video_deleted_at ? db.storage.from('interview-recordings').createSignedUrl(selected.recording_path, 600) : Promise.resolve({ data: null }),
    db.from('interview_practice_logs').select('self_rating').eq('id', selected.id).eq('user_id', user.id).maybeSingle(),
  ]) : [{ data: null }, { data: null }]
  return <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
    <header><h1 className="font-display text-3xl font-semibold sm:text-5xl">Practice recordings &amp; transcripts</h1><p className="mt-4 text-muted">Listen back, review your wording and keep notes for your next response. Your practice audio is private.</p></header>
    <Link href="/interviews/practice" className="inline-flex min-h-11 items-center font-semibold text-brand">← Practice questions</Link>
    {error ? <p role="alert">Your recordings could not load. Please refresh and try again.</p> : selected ? <>
      <Link href={href({ page: library.page })} className="block font-semibold text-brand">← All practice recordings</Link>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="min-w-0 space-y-5 rounded-2xl bg-surface p-6">
          <h2 className="font-display text-2xl font-semibold">{selected.station_title}</h2>
          <p className="text-sm text-muted">{formatRecordingDate(selected.created_at)} · {selected.format === 'mmi' ? 'MMI' : 'Panel'} · {Math.floor(selected.duration_seconds / 60)}:{String(selected.duration_seconds % 60).padStart(2, '0')}</p>
          {selected.upload_status !== 'ready' ? <p>Upload unfinished. Return to the recording tab and resume saving your audio.</p> : <InterviewMediaPlayer key={selected.id} attemptId={selected.id} kind="audio" url={media?.signedUrl ?? null} events={Array.isArray(selected.question_events) ? selected.question_events as QuestionEvent[] : []} />}
          <InterviewTranscript key={selected.id} attemptId={selected.id} initialStatus={selected.transcription_status} initialTranscript={selected.transcript} />
          {activity && <InterviewSelfRating key={selected.id} activityId={selected.id} initialRating={activity.self_rating} />}
          <InterviewStudentActions key={selected.id} id={selected.id} format={selected.format} eligible={false} credits={0} deleteOnly backHref={href()} />
        </article>
        <InterviewStudyNotes />
      </div>
    </> : <>
      <InterviewLibraryRefresh message="Updating your practice recordings…" />
      <form action={base} role="search" className="flex gap-3"><label className="flex-1"><span className="sr-only">Search practice recordings</span><input className={`${control} w-full`} name="q" maxLength={150} defaultValue={q} placeholder="Search practice recordings" /></label><button className={control}>Search</button></form>
      <p className="text-sm text-muted">{library.count} recordings{q && <> · <Link className="underline" href={base}>Clear search</Link></>}</p>
      {library.items.length ? <ul className="divide-y divide-border rounded-2xl bg-surface">{library.items.map(entry => <li key={entry.id} className="p-5"><Link prefetch={false} href={href({ page: library.page, attempt: entry.id })} className="font-semibold text-brand">{entry.title}</Link><p className="mt-2 text-sm text-muted">{formatRecordingDate(entry.createdAt)} · {entry.format === 'mmi' ? 'MMI' : 'Panel'}</p><p className="mt-2 text-sm">{entry.responses[0].status === 'saved' ? 'Open audio & transcript' : 'Upload unfinished or recording unavailable'}</p></li>)}</ul> : <p className="rounded-2xl bg-surface p-6">{q ? 'No recordings match this search.' : 'Save an audio response from Practice and it will appear here.'}</p>}
      {library.pages > 1 && <nav aria-label="Practice recording pages" className="flex items-center justify-between">{library.page > 1 ? <Link className={control} href={href({ page: library.page - 1 })}>Previous</Link> : <span />}<p>Page {library.page} of {library.pages}</p>{library.page < library.pages ? <Link className={control} href={href({ page: library.page + 1 })}>Next</Link> : <span />}</nav>}
    </>}
  </main>
}
