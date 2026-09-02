'use client'
import { useState } from 'react'
import { generateAiDraftAction, saveMarkingDraftAction, approveMarkingAction } from '@/lib/essays/actions'

type Quote = { text: string; author?: string | null }
type Detail = {
  responseId: string
  status: 'pending' | 'approved' | 'none'
  prompt: { task: string; theme: string; instructions: string; quotes: Quote[] }
  body: string
  wordCount: number
  timed: boolean
  durationMinutes: number | null
  aiFeedback: string | null
  draftFeedback: string | null
  tutorFeedback: string | null
  studentName: string | null
}

export function MarkingReview({ detail }: { detail: Detail }) {
  const [status, setStatus] = useState(detail.status)
  const [draft, setDraft] = useState(detail.draftFeedback ?? detail.aiFeedback ?? detail.tutorFeedback ?? '')
  const [aiRaw, setAiRaw] = useState<string | null>(detail.aiFeedback)
  const [gen, setGen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const chatPrompt =
    `Mark this GAMSAT Section II essay using my marking skill/rubric.\n\n` +
    `Task ${detail.prompt.task} — ${detail.prompt.theme}\n` +
    `Quotes:\n${detail.prompt.quotes.map((q) => `- "${q.text}"${q.author ? ` — ${q.author}` : ''}`).join('\n')}\n\n` +
    `Student's essay:\n"""\n${detail.body}\n"""`

  async function generate() {
    setGen(true); setMsg(null)
    const r = await generateAiDraftAction(detail.responseId)
    setGen(false)
    if (r.ok && r.text) {
      setAiRaw(r.text)
      if (!draft.trim()) setDraft(r.text)
      setMsg('AI draft generated below — edit before approving.')
    } else if (r.reason === 'no_key') {
      setMsg('AI is not configured yet (no ANTHROPIC_API_KEY). Use “Copy prompt for chat”, or write feedback manually.')
    } else {
      setMsg('Could not generate a draft. Try again, or write feedback manually.')
    }
  }
  async function save() {
    setSaving(true); setMsg(null)
    const r = await saveMarkingDraftAction(detail.responseId, draft)
    setSaving(false); setMsg(r.ok ? 'Draft saved.' : 'Save failed.')
  }
  async function approve() {
    if (!draft.trim()) { setMsg('Write some feedback before approving.'); return }
    setApproving(true); setMsg(null)
    const r = await approveMarkingAction(detail.responseId, draft)
    setApproving(false)
    if (r.ok) { setStatus('approved'); setMsg('Approved and sent to the student.') } else setMsg('Approve failed.')
  }
  async function copyPrompt() {
    try { await navigator.clipboard.writeText(chatPrompt); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* ignore */ }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{detail.prompt.theme}</h1>
        <span className="rounded-full bg-brand-muted px-2 py-0.5 text-[11px] font-semibold text-brand">Task {detail.prompt.task}</span>
        {status === 'approved' ? <span className="rounded-full bg-[#e6f5ee] px-2 py-0.5 text-[11px] font-semibold text-[#157d72]">Approved</span> : <span className="rounded-full bg-[#fdf3e0] px-2 py-0.5 text-[11px] font-semibold text-[#b45309]">Pending</span>}
      </div>
      <p className="mt-1 text-sm text-muted">{detail.studentName ?? 'Student'} · {detail.wordCount} words · {detail.timed ? `timed ${detail.durationMinutes ?? ''} min` : 'untimed'}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Essay + prompt */}
        <div className="space-y-4">
          <details className="rounded-xl border border-border bg-surface p-4" open>
            <summary className="cursor-pointer text-sm font-semibold">Prompt &amp; quotes</summary>
            <p className="mt-2 text-sm leading-relaxed text-muted">{detail.prompt.instructions}</p>
            <ul className="mt-2 space-y-1.5">
              {detail.prompt.quotes.map((q, k) => (
                <li key={k} className="border-l-2 border-brand pl-3 text-sm italic">“{q.text}”{q.author ? <span className="text-xs not-italic text-muted"> — {q.author}</span> : null}</li>
              ))}
            </ul>
          </details>
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Student essay</p>
            <div className="whitespace-pre-wrap text-[15px] leading-[1.7]" style={{ fontFamily: 'Georgia, serif' }}>
              {detail.body.trim() ? detail.body : <span className="text-muted">Left blank.</span>}
            </div>
          </div>
        </div>

        {/* Feedback editor */}
        <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <div className="flex flex-wrap gap-2">
            <button onClick={generate} disabled={gen} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground disabled:opacity-55">
              {gen ? 'Generating…' : aiRaw ? 'Regenerate AI draft' : 'Generate AI draft'}
            </button>
            <button onClick={copyPrompt} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-muted">
              {copied ? 'Copied ✓' : 'Copy prompt for chat'}
            </button>
          </div>
          {msg ? <p className="text-sm text-muted">{msg}</p> : null}

          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Feedback to the student {status === 'approved' ? '(editing will re-send on approve)' : ''}</span>
            <textarea
              value={draft} onChange={(e) => setDraft(e.target.value)} rows={18}
              placeholder="Write or paste the feedback here. This is exactly what the student will see once you approve."
              className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-[14px] leading-relaxed outline-none focus:border-brand"
            />
          </label>

          {aiRaw && aiRaw !== draft ? (
            <details className="rounded-xl border border-border bg-surface p-3 text-sm">
              <summary className="cursor-pointer text-xs font-semibold text-muted">View original AI draft</summary>
              <div className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-muted">{aiRaw}</div>
            </details>
          ) : null}

          <div className="flex items-center gap-3 pt-1">
            <button onClick={save} disabled={saving} className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-muted disabled:opacity-55">
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            <button onClick={approve} disabled={approving} className="rounded-lg bg-[#2f9e44] px-5 py-2 text-sm font-semibold text-white disabled:opacity-55">
              {approving ? 'Sending…' : status === 'approved' ? 'Re-send updated feedback' : 'Approve & send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
