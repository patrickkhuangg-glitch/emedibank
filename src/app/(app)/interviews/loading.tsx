export default function InterviewPageLoading(){
 return <div role="status" aria-live="polite" aria-busy="true" className="mx-auto max-w-[1240px] px-5 py-10 sm:px-8 sm:py-14">
  <span className="sr-only">Opening interview page…</span>
  <div aria-hidden="true" className="space-y-6">
   <div className="h-10 w-2/3 max-w-lg rounded-xl bg-surface-muted"/>
   <div className="h-4 w-full max-w-xl rounded-full bg-surface-muted"/>
   <div className="mt-8 space-y-5 rounded-3xl bg-surface p-6 sm:p-8">
    <div className="h-6 w-1/2 max-w-xs rounded-lg bg-surface-muted"/>
    <div className="h-11 w-full rounded-xl bg-surface-muted"/>
    <div className="h-24 w-full rounded-xl bg-surface-muted"/>
   </div>
  </div>
 </div>
}
