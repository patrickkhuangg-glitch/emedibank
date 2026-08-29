'use client'
import { useState } from 'react'
import { createVideoUploadAction } from '@/lib/admin/question-actions'

export function VideoUpload({ questionId, status }: { questionId: string; status: string }) {
  const [state, setState] = useState<string>(status)
  const [busy, setBusy] = useState(false)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setState('starting…')
    const res = await createVideoUploadAction(questionId)
    if ('error' in res) {
      setState('error: ' + res.error)
      setBusy(false)
      return
    }
    setState('uploading…')
    try {
      const put = await fetch(res.uploadUrl, { method: 'PUT', body: file })
      setState(put.ok ? 'uploaded — processing' : 'upload failed')
    } catch {
      setState('upload failed')
    }
    setBusy(false)
  }

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted hover:text-foreground">
      <input type="file" accept="video/*" className="hidden" onChange={onFile} disabled={busy} />
      <span className="rounded-md border border-border px-2 py-1">
        {state === 'ready' ? 'Replace video' : state === 'none' ? 'Add video' : state}
      </span>
    </label>
  )
}
