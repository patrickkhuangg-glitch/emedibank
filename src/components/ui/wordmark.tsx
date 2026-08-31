import { StudocyteMark, type MarkVariant } from './studocyte-mark'

// The Studocyte lockup: the cell mark + wordmark. "-cyte" (the cell half) carries
// the accent. Pass variant="clean" wherever the faceless exam-mode mark belongs.
export function Wordmark({
  className = '',
  markSize = 26,
  variant = 'playful',
}: {
  className?: string
  markSize?: number
  variant?: MarkVariant
}) {
  return (
    <span className={`inline-flex items-center gap-2 font-display font-extrabold tracking-tight ${className}`}>
      <StudocyteMark variant={variant} size={markSize} />
      <span>
        <span className="text-foreground">Studo</span>
        <span className="text-brand">cyte</span>
      </span>
    </span>
  )
}
