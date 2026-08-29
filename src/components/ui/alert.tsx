export function Alert({
  kind = 'error',
  children,
}: {
  kind?: 'error' | 'success'
  children: React.ReactNode
}) {
  const styles =
    kind === 'success'
      ? 'bg-success-muted text-success'
      : 'bg-[color-mix(in_srgb,#dc2626_12%,transparent)] text-[#dc2626]'
  return (
    <div className={`rounded-lg px-3 py-2.5 text-sm ${styles}`} role="status">
      {children}
    </div>
  )
}
