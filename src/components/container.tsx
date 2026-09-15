import type { ReactNode } from 'react'

/** Centres page content and applies consistent horizontal gutters. */
export function Container({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`page-frame ${className}`}>{children}</div>
  )
}

/** Standard page rhythm for dashboards, libraries, account and admin screens.
 * Keep narrow reading/form measures inside this full-width page shell. */
export function PageContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <Container className={`page-shell ${className}`}>{children}</Container>
}
