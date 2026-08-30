import type { Metadata } from 'next'
import { Sora, Manrope } from 'next/font/google'
import './globals.css'

const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'EMediBank — Medical admissions question bank',
    template: '%s · EMediBank',
  },
  description:
    'Practise UCAT, GAMSAT and ISAT questions with written and video explanations. Part of EMeducate.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
