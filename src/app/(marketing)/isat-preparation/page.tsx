import type { Metadata } from 'next'
import { ExamComingSoon } from '@/components/marketing/exam-coming-soon'

export const metadata: Metadata = {
  title: 'ISAT Preparation · Coming Soon',
  description: 'Studocyte ISAT preparation is coming soon. Join the opening list for updates.',
  alternates: { canonical: '/isat-preparation' },
}

export default function IsatPreparationPage() {
  return <ExamComingSoon exam="ISAT" />
}
