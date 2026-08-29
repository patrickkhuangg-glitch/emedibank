export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display font-semibold tracking-tight ${className}`}>
      <span className="text-foreground">emedi</span>
      <span className="text-brand">bank</span>
      <span className="text-brand">.</span>
    </span>
  )
}
