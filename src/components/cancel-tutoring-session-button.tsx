'use client'

import { cancelTutoringSessionAction } from '@/lib/tutoring/actions'

export function CancelTutoringSessionButton({ sessionId, label = 'Cancel lesson' }: { sessionId: string; label?: string }) {
  return (
    <form
      action={cancelTutoringSessionAction}
      onSubmit={(event) => {
        if (!window.confirm('Cancel this lesson? The Zoom meeting and any automatically linked calendar event will be removed.')) event.preventDefault()
      }}
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <button type="submit" className="eb-press rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50">
        {label}
      </button>
    </form>
  )
}
