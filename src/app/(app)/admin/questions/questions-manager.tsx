'use client'
import { useEffect, useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { VideoUpload } from './video-upload'
import type { QFilter } from '@/lib/admin/question-filter'
import {
  bulkDeleteIds,
  bulkSetPublishedIds,
  bulkDeleteMatching,
  bulkSetPublishedMatching,
} from '@/lib/admin/question-actions'

export type Row = {
  id: string
  stem: string
  published: boolean
  videoStatus: string
  subtestLabel: string
  type: string
}

export function QuestionsManager({
  rows,
  total,
  page,
  pageSize,
  filter,
  exams,
  subtests,
}: {
  rows: Row[]
  total: number
  page: number
  pageSize: number
  filter: QFilter
  exams: { id: string; name: string }[]
  subtests: { id: string; name: string; examId: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [allMatching, setAllMatching] = useState(false)
  const [search, setSearch] = useState(filter.search)

  // Reset selection when the filter/page changes (React's "adjust state on prop
  // change during render" pattern — no effect needed). Mutations clear it too.
  const paramsKey = params.toString()
  const [prevKey, setPrevKey] = useState(paramsKey)
  if (paramsKey !== prevKey) {
    setPrevKey(paramsKey)
    if (selected.size || allMatching) {
      setSelected(new Set())
      setAllMatching(false)
    }
  }

  // Debounced search -> query string.
  useEffect(() => {
    if (search === filter.search) return
    const t = setTimeout(() => setParam({ q: search || null, page: null }), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function setParam(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    }
    const qs = next.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const pageIds = rows.map((r) => r.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const selectedCount = allMatching ? total : selected.size
  const subtestOptions = filter.examId ? subtests.filter((s) => s.examId === filter.examId) : subtests

  function toggleRow(id: string) {
    setAllMatching(false)
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  function togglePage() {
    setAllMatching(false)
    setSelected(allPageSelected ? new Set() : new Set(pageIds))
  }
  function clearSelection() {
    setSelected(new Set())
    setAllMatching(false)
  }

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn()
      clearSelection()
      router.refresh()
    })
  }
  const doDelete = () => {
    if (!confirm(`Delete ${selectedCount} question${selectedCount === 1 ? '' : 's'}? This cannot be undone.`)) return
    run(() => (allMatching ? bulkDeleteMatching(filter) : bulkDeleteIds([...selected])))
  }
  const doPublish = (published: boolean) =>
    run(() => (allMatching ? bulkSetPublishedMatching(filter, published) : bulkSetPublishedIds([...selected], published)))

  const selectCls = 'rounded-lg border border-border bg-surface px-3 py-2 text-sm'

  return (
    <section className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={filter.examId ?? ''} onChange={(e) => setParam({ exam: e.target.value || null, subtest: null, page: null })} className={selectCls}>
          <option value="">All exams</option>
          {exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
        </select>
        <select value={filter.subtestId ?? ''} onChange={(e) => setParam({ subtest: e.target.value || null, page: null })} className={selectCls}>
          <option value="">All sections</option>
          {subtestOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filter.status} onChange={(e) => setParam({ status: e.target.value === 'all' ? null : e.target.value, page: null })} className={selectCls}>
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search question text…"
          className="min-w-[12rem] flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>

      {/* Header: count + select all */}
      <div className="flex items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2 text-muted">
          <input type="checkbox" checked={allPageSelected} onChange={togglePage} className="h-4 w-4 accent-[color:var(--brand)]" />
          <span>{total} question{total === 1 ? '' : 's'}{filter.examId || filter.subtestId || filter.status !== 'all' || filter.search ? ' (filtered)' : ''}</span>
        </label>
        <span className="text-xs text-muted">Page {page} of {totalPages}</span>
      </div>

      {/* Select-all-matching banner */}
      {allPageSelected && total > rows.length ? (
        <div className="rounded-lg bg-brand-muted px-4 py-2 text-sm text-brand">
          {allMatching ? (
            <>All {total} matching questions are selected. <button onClick={clearSelection} className="font-semibold underline">Clear</button></>
          ) : (
            <>All {rows.length} on this page selected. <button onClick={() => setAllMatching(true)} className="font-semibold underline">Select all {total} matching</button></>
          )}
        </div>
      ) : null}

      {/* Bulk action bar */}
      {selectedCount > 0 ? (
        <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface/95 p-2.5 shadow-sm backdrop-blur">
          <span className="px-2 text-sm font-medium">{selectedCount} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button disabled={pending} onClick={() => doPublish(true)} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted disabled:opacity-50">Publish</button>
            <button disabled={pending} onClick={() => doPublish(false)} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted disabled:opacity-50">Unpublish</button>
            <button disabled={pending} onClick={doDelete} className="rounded-lg bg-[#dc2626] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">Delete</button>
            <button disabled={pending} onClick={clearSelection} className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-foreground">Clear</button>
          </div>
        </div>
      ) : null}

      {/* List */}
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">No questions match these filters.</p>
        ) : (
          rows.map((q) => {
            const sel = selected.has(q.id) || allMatching
            return (
              <div key={q.id} className={`flex items-start gap-3 px-4 py-3 transition-colors ${sel ? 'bg-brand-muted/40' : ''}`}>
                <input type="checkbox" checked={sel} onChange={() => toggleRow(q.id)} className="mt-1 h-4 w-4 flex-none accent-[color:var(--brand)]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="truncate">{q.subtestLabel}</span>
                    <span className="flex-none rounded-full bg-surface-muted px-2 py-0.5 text-[11px]">{q.type}</span>
                    <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] ${q.published ? 'bg-success-muted text-success' : 'bg-surface-muted text-muted'}`}>{q.published ? 'Published' : 'Draft'}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm">{q.stem}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <VideoUpload questionId={q.id} status={q.videoStatus} />
                    <button disabled={pending} onClick={() => run(() => bulkSetPublishedIds([q.id], !q.published))} className="text-muted hover:text-foreground disabled:opacity-50">
                      {q.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button disabled={pending} onClick={() => { if (confirm('Delete this question?')) run(() => bulkDeleteIds([q.id])) }} className="text-[#dc2626] hover:opacity-80 disabled:opacity-50">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button disabled={page <= 1} onClick={() => setParam({ page: String(page - 1) })} className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface-muted disabled:opacity-40">← Prev</button>
          <span className="px-2 text-muted">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setParam({ page: String(page + 1) })} className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface-muted disabled:opacity-40">Next →</button>
        </div>
      ) : null}
    </section>
  )
}
