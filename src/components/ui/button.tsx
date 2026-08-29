import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
const base =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 disabled:pointer-events-none'
const variants: Record<Variant, string> = {
  primary: 'bg-brand text-brand-foreground hover:opacity-90',
  secondary: 'border border-border bg-surface hover:bg-surface-muted',
  ghost: 'hover:bg-surface-muted',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}

export function ButtonLink({
  variant = 'primary',
  className = '',
  href,
  children,
}: {
  variant?: Variant
  className?: string
  href: string
  children: ReactNode
}) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  )
}
