import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Bricolage_Grotesque, Hanken_Grotesk } from 'next/font/google'
import { SITE_URL } from '@/lib/site'
import { Analytics } from '@/components/analytics'
import { StagingBanner } from '@/components/staging-banner'
import { getAppEnvironment, isPublicProduction } from '@/lib/deployment-environment'
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: 'Studocyte',
  title: {
    default: 'Studocyte — Build your exam immunity',
    template: '%s · Studocyte',
  },
  description:
    'Practise UCAT, GAMSAT and ISAT in the real exam interface, with written explanations for every answer. Part of EMeducate.',
  openGraph: {
    title: 'Studocyte — Build your exam immunity',
    description:
      'Practise UCAT, GAMSAT and ISAT in the real exam interface, with written explanations for every answer. Part of EMeducate.',
    siteName: 'Studocyte',
    type: 'website',
    url: '/',
  },
  robots: isPublicProduction()
    ? undefined
    : {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
          index: false,
          follow: false,
          noimageindex: true,
        },
      },
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // Reading request headers also prevents static HTML from reusing CSP nonces.
  await headers()
  const staging = getAppEnvironment() === 'staging'
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${hanken.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {staging && <StagingBanner />}
        {children}
        <Analytics />
      </body>
    </html>
  )
}
