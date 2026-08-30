// Exam-styled confirmation dialog, matching the UCAT "Ready to Begin" modal.
// Used before an irreversible finish/end-of-section so answers are never
// submitted by accident.
export function ExamConfirm({
  title,
  message,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/30" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div className="w-[min(880px,92vw)] text-white" style={{ background: 'linear-gradient(#1a78bf,#1268ad)' }}>
        <div className="px-5 py-3 text-lg font-semibold" style={{ background: '#0f5c9e' }}>{title}</div>
        <div className="flex items-center gap-4 px-6 py-6">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[#e0a500] text-2xl font-bold leading-none">!</span>
          <p className="text-[15px]">{message}</p>
        </div>
        <div className="flex justify-center gap-4 pb-6">
          <button onClick={onConfirm} className="min-w-[88px] rounded border border-white/70 px-4 py-1.5 hover:bg-white/10">{confirmLabel}</button>
          <button onClick={onCancel} className="min-w-[88px] rounded border border-white/70 px-4 py-1.5 hover:bg-white/10">{cancelLabel}</button>
        </div>
      </div>
    </div>
  )
}
