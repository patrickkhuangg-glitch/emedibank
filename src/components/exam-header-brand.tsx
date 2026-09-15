import { StudocyteMark } from '@/components/ui/studocyte-mark'
import type { InterfaceMode } from '@/lib/supabase/types'

/** Shared student header identity, with the exam always visible on small screens. */
export function ExamHeaderBrand({ label, variant = 'playful' }: { label: string; variant?: InterfaceMode }) {
  return <span className="flex min-w-0 items-center gap-2 sm:gap-3">
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mint text-white" aria-hidden="true">
      <StudocyteMark variant={variant} size={25} />
    </span>
    <span className="flex min-w-0 flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="font-display text-lg font-semibold leading-tight sm:text-xl">Studocyte</span>
      <span aria-hidden="true" className="hidden h-5 w-px shrink-0 bg-border sm:block" />
      <span className="max-w-36 truncate text-xs font-medium text-muted sm:text-sm">{label}</span>
    </span>
  </span>
}
