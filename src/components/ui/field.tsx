import type { ComponentProps } from 'react'

export function Field({
  label,
  name,
  className = '',
  ...props
}: ComponentProps<'input'> & { label: string; name: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        name={name}
        className={`w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand ${className}`}
        {...props}
      />
    </label>
  )
}
