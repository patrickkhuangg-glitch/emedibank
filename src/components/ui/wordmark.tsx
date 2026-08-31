import { StudocyteMark, type MarkVariant } from './studocyte-mark'

// The Studocyte lockup: the cell mark + wordmark, with a small "Part of EMeducate"
// endorsement tucked under the wordmark, bottom-right. "-cyte" (the cell half)
// carries the accent. Pass variant="clean" for the faceless exam-mode mark.
export function Wordmark({
  className = '',
  markSize = 26,
  variant = 'playful',
  endorsement = true,
}: {
  className?: string
  markSize?: number
  variant?: MarkVariant
  endorsement?: boolean
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <StudocyteMark variant={variant} size={markSize} />
      <span className="inline-flex flex-col leading-none">
        <span className="font-display font-extrabold tracking-tight">
          <span className="text-foreground">Studo</span>
          <span className="text-brand">cyte</span>
        </span>
        {endorsement ? (
          <span className="mt-1 self-end font-sans text-[0.44em] font-medium uppercase tracking-[0.12em] text-muted">
            Part of EMeducate
          </span>
        ) : null}
      </span>
    </span>
  )
}
