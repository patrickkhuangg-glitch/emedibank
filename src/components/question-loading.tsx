import { Spinner } from '@/components/spinner'

export function QuestionLoading({ error, onRetry }: { error: boolean; onRetry: () => void }) {
  return (
    <div className="col-span-full flex min-h-[280px] flex-col items-center justify-center gap-4 px-6 py-16 text-center" aria-live="polite" aria-busy={!error}>
      {!error ? <Spinner size={40} /> : null}
      <p className="text-base font-semibold text-[#1b2a46]">{error ? 'We couldn’t load this section.' : 'Loading your questions…'}</p>
      <p className="max-w-sm text-sm text-gray-600">{error ? 'Your timer has not started. Try loading the questions again.' : 'Your timer will start when all questions and diagrams are ready.'}</p>
      {error ? <button onClick={onRetry} className="rounded border border-[#1268ad] px-5 py-2 text-sm font-semibold text-[#1268ad] hover:bg-blue-50">Retry loading</button> : null}
    </div>
  )
}
