// Brand loading animation. A ring spinner plus an optional centred splash for
// route/question loading. Motion is feedback, so it keeps spinning even under
// reduced-motion (the only thing on screen that indicates progress).
export function Spinner({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-[3px] border-brand/20 border-t-brand ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  )
}

export function LoadingSplash({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4">
      <Spinner size={40} />
      <p className="text-sm text-muted">{label}</p>
    </div>
  )
}
