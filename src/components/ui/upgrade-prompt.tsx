import { ButtonLink } from './button'

export function UpgradePrompt({ examName }: { examName: string }) {
  return (
    <div className="rounded-2xl border border-border bg-brand-muted p-8 text-center">
      <h2 className="text-lg font-semibold">This is a {examName} premium subtest</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        Unlock every {examName} subtest with a subscription. Start a 7-day free trial — cancel anytime.
      </p>
      <ButtonLink href="/pricing" className="mt-5">See plans</ButtonLink>
    </div>
  )
}
