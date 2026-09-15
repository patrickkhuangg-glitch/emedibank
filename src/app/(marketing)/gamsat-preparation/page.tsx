import type { Metadata } from 'next'
import { ExamComingSoon } from '@/components/marketing/exam-coming-soon'

export const metadata: Metadata = {
  title: 'GAMSAT Preparation · Coming Soon',
  description: 'Studocyte GAMSAT preparation is coming soon. Join the opening list for updates.',
  alternates: { canonical: '/gamsat-preparation' },
}

export default function GamsatPreparationPage() {
  return <ExamComingSoon exam="GAMSAT" />
}
