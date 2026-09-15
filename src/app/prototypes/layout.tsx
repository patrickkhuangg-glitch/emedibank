import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

export const metadata = { robots: { index: false, follow: false } }

export default function PrototypeLayout({ children }: { children: ReactNode }) {
  // Prototypes are local design tools, never an alternate public question bank.
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL === '1') notFound()
  return children
}
