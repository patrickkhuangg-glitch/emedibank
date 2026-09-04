'use client'

import { useEffect, useState } from 'react'

type StudyNote = {
  id: string
  body: string
  created_at: string
}

export function InterviewStudyNotes({ preview = false, onNoteCountChange }: { preview?: boolean; onNoteCountChange?: (count: number) => void }) {
  const [draft, setDraft] = useState('')
  const [notes, setNotes] = useState<StudyNote[]>([])
  const [loading, setLoading] = useState(!preview)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (preview) return
    let active = true
    void fetch('/api/interviews/study-notes')
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Study notes could not be loaded.')
        return payload.notes as StudyNote[]
      })
      .then((loadedNotes) => {
        if (!active) return
        setNotes(loadedNotes)
        onNoteCountChange?.(loadedNotes.length)
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Study notes could not be loaded.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [onNoteCountChange, preview])

  async function saveNote() {
    const body = draft.trim()
    if (!body || saving) return

    setDraft('')
    setSaving(true)
    setError('')

    if (preview) {
      const nextNotes = [{ id: crypto.randomUUID(), body, created_at: new Date().toISOString() }, ...notes]
      setNotes(nextNotes)
      onNoteCountChange?.(nextNotes.length)
      setSaving(false)
      return
    }

    try {
      const response = await fetch('/api/interviews/study-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Your note could not be saved. Try again.')
      const nextNotes = [payload.note as StudyNote, ...notes]
      setNotes(nextNotes)
      onNoteCountChange?.(nextNotes.length)
    } catch (requestError) {
      setDraft(body)
      setError(requestError instanceof Error ? requestError.message : 'Your note could not be saved. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-3xl border border-border bg-surface p-6 eb-soft">
      <div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold tracking-tight">Study notes</h2><NoteIcon /></div>
      <p className="mt-2 text-sm leading-6 text-muted">Keep short reminders for what to improve in your next response.</p>
      <label className="sr-only" htmlFor="interview-note">Your study note</label>
      <textarea id="interview-note" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={280} placeholder="For example: start with the patient’s perspective before discussing options." className="mt-5 min-h-28 w-full resize-none rounded-2xl border border-border bg-background p-3.5 text-sm leading-6 outline-none placeholder:text-muted focus:border-brand" />
      <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-muted">{draft.length}/280</span><button type="button" disabled={!draft.trim() || saving} onClick={saveNote} className="eb-press rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground disabled:cursor-not-allowed disabled:opacity-45">{saving ? 'Saving…' : 'Add note'}</button></div>
      {error ? <p role="alert" className="mt-4 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="mt-6 border-t border-border pt-5">
        <p className="text-xs font-semibold text-muted">{notes.length ? `${notes.length} saved ${notes.length === 1 ? 'reminder' : 'reminders'}` : 'Your saved reminders'}</p>
        {loading ? <p className="mt-3 text-sm text-muted">Loading notes…</p> : notes.length ? <ol className="mt-3 divide-y divide-border">{notes.map((note) => <li key={note.id} className="py-3 first:pt-0 last:pb-0"><p className="text-sm leading-6 text-foreground">{note.body}</p><p className="mt-1 text-xs text-muted">{formatDate(note.created_at)}</p></li>)}</ol> : <p className="mt-3 text-sm leading-6 text-muted">Add a reminder and it will be here next time you return.</p>}
      </div>
    </section>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' }).format(new Date(value))
}

function NoteIcon() {
  return <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-brand" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3.5h10v13H5z" /><path d="M8 7h4M8 10h5M8 13h3" /></svg>
}
