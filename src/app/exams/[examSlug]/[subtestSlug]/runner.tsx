'use client'
import { useCallback, useEffect, useState } from 'react'
import MuxPlayer from '@mux/mux-player-react'
import Link from 'next/link'
import {
  fetchQuestionAction,
  answerQuestionAction,
  loadExplanationVideoAction,
} from '@/lib/questions/actions'

type SafeQuestion = {
  id: string
  topic: string | null
  stem: string
  options: { id: string; label: string; body: string }[]
}
type Result = {
  is_correct: boolean
  correct_option_id: string | null
  explanation_text: string | null
  can_watch_video: boolean
  has_video: boolean
  video_ready: boolean
}

export function Runner({
  subtestName,
  questionIds,
}: {
  subtestName: string
  questionIds: string[]
}) {
  const [i, setI] = useState(0)
  const [q, setQ] = useState<SafeQuestion | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [video, setVideo] = useState<{ playbackId: string; token: string } | null>(null)
  const [startedAt, setStartedAt] = useState(Date.now())

  const load = useCallback(
    async (idx: number) => {
      setLoading(true)
      setQ(null)
      setResult(null)
      setSelected(null)
      setVideo(null)
      const r = await fetchQuestionAction(questionIds[idx])
      if (r.locked) {
        setQ(null)
      } else {
        setQ(r.question)
        setStartedAt(Date.now())
      }
      setLoading(false)
    },
    [questionIds],
  )

  useEffect(() => {
    if (questionIds.length) load(0)
  }, [questionIds, load])

  async function submit() {
    if (!selected || !q) return
    const t = Math.round((Date.now() - startedAt) / 1000)
    const r = await answerQuestionAction(q.id, selected, t)
    if ('denied' in r) return
    setResult(r)
    if (r.can_watch_video && r.video_ready) {
      const v = await loadExplanationVideoAction(q.id)
      if (!('denied' in v)) setVideo(v)
    }
  }

  function go(delta: number) {
    const n = i + delta
    if (n >= 0 && n < questionIds.length) {
      setI(n)
      load(n)
    }
  }

  const total = questionIds.length

  return (
    <div className="overflow-hidden rounded-xl border border-border shadow-sm">
      {/* UCAT-style blue chrome */}
      <div className="flex items-center justify-between bg-[#0e6cb0] px-5 py-3 text-white">
        <span className="font-medium">{subtestName}</span>
        <span className="text-sm tabular-nums">
          Question {i + 1} of {total}
        </span>
      </div>

      <div className="bg-surface p-6">
        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : !q ? (
          <p className="text-muted">This question isn&rsquo;t available.</p>
        ) : (
          <>
            {q.topic ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">{q.topic}</p>
            ) : null}
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{q.stem}</p>

            <div className="mt-5 flex flex-col gap-2">
              {q.options.map((o) => {
                const isSel = selected === o.id
                const isCorrect = result && result.correct_option_id === o.id
                const isWrongPick = result && isSel && !result.is_correct
                let cls = 'border-border bg-surface hover:bg-surface-muted'
                if (isCorrect) cls = 'border-success bg-success-muted'
                else if (isWrongPick) cls = 'border-[#dc2626] bg-[color-mix(in_srgb,#dc2626_10%,transparent)]'
                else if (isSel) cls = 'border-brand'
                return (
                  <button
                    key={o.id}
                    disabled={!!result}
                    onClick={() => setSelected(o.id)}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${cls}`}
                  >
                    <span className="grid h-6 w-6 flex-none place-items-center rounded-md bg-surface-muted text-xs font-semibold">
                      {o.label}
                    </span>
                    <span>{o.body}</span>
                  </button>
                )
              })}
            </div>

            {!result ? (
              <button
                onClick={submit}
                disabled={!selected}
                className="mt-5 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Submit answer
              </button>
            ) : (
              <div className="mt-6 space-y-4">
                <p className={`text-sm font-semibold ${result.is_correct ? 'text-success' : 'text-[#dc2626]'}`}>
                  {result.is_correct ? 'Correct' : 'Not quite'}
                </p>
                {result.explanation_text ? (
                  <div className="rounded-lg border border-border bg-surface-muted p-4 text-sm leading-relaxed">
                    <p className="mb-1 font-semibold">Explanation</p>
                    {result.explanation_text}
                  </div>
                ) : null}

                {/* Video explanation — gated */}
                {video ? (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <MuxPlayer
                      playbackId={video.playbackId}
                      tokens={{ playback: video.token }}
                      streamType="on-demand"
                      accentColor="#157d72"
                    />
                  </div>
                ) : !result.has_video ? null : result.can_watch_video ? (
                  result.video_ready ? null : (
                    <p className="text-sm text-muted">Video explanation is still processing.</p>
                  )
                ) : (
                  <div className="rounded-lg border-2 border-brand bg-brand-muted p-5 text-center">
                    <p className="font-semibold">Video explanation</p>
                    <p className="mt-1 text-sm text-muted">
                      Watch this question worked through on video with a subscription.
                    </p>
                    <Link
                      href="/pricing"
                      className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground"
                    >
                      See plans
                    </Link>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* bottom nav */}
      <div className="flex items-center justify-between border-t border-border bg-surface px-5 py-3 text-sm">
        <button onClick={() => go(-1)} disabled={i === 0} className="text-muted disabled:opacity-40 hover:text-foreground">
          ← Previous
        </button>
        <span className="text-muted tabular-nums">{i + 1} / {total}</span>
        <button onClick={() => go(1)} disabled={i >= total - 1} className="text-muted disabled:opacity-40 hover:text-foreground">
          Next →
        </button>
      </div>
    </div>
  )
}
