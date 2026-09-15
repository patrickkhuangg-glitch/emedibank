import type { Metadata } from 'next'
import { ExamComingSoon } from '@/components/marketing/exam-coming-soon'

export const metadata: Metadata = {
  title: 'UCAT Preparation · Coming Soon',
  description: 'Studocyte UCAT preparation is coming soon. Join the opening list for updates.',
  alternates: { canonical: '/ucat-preparation' },
}

export default function UcatPreparationPage() {
  return <ExamComingSoon exam="UCAT" />
}
