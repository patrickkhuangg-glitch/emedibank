import type { Metadata } from 'next'
import { Bricolage_Grotesque, Hanken_Grotesk, IBM_Plex_Mono } from 'next/font/google'
import { SITE_URL } from '@/lib/site'
import { Analytics } from '@/components/analytics'
import './globals.css'

// Display — confident, slightly unconventional headlines. Variable font: the full
// 200–800 weight range loads, so no explicit weight list.
const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
})

// Body — calm at length, friendly enough to open at 11pm.
const hanken = Hanken_Grotesk({
  variable: '--font-hanken',
  subsets: ['latin'],
})

// Specimen-label voice — data, timers, XP.
const plexMono = IBM_Plex_Mono({
  variable: '--font-plex',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Studocyte — Build your exam immunity',
    template: '%s · Studocyte',
  },
  description:
    'Practise UCAT, GAMSAT and ISAT in the real exam interface, with written and video explanations for every answer. Part of EMeducate.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${hanken.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}<Analytics /></body>
    </html>
  )
}
