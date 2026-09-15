'use client'
export default function EntryError({ reset }: { reset: () => void }) {
  return <div className="page-frame page-shell"><h1 className="page-title">Let’s try that again.</h1><p className="mt-3 text-sm text-muted">Your study space couldn’t open just now. Your progress is saved.</p><button onClick={reset} className="mt-5 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground">Try again</button></div>
}
