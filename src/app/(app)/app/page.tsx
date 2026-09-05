import type { Metadata } from 'next'
import { requireStudent } from '@/lib/auth/dal'
import { listExams } from '@/lib/exam/current'
import { hasActiveEntitlement } from '@/lib/access'
import { ExamPicker } from './exam-picker'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Choose your exam' }

export default async function ExamPickerPage() {
  const profile = await requireStudent('/app')
  const exams = await listExams()
  const entitled = await Promise.all(exams.map((e) => hasActiveEntitlement(profile.id, e.id)))

  return (
    <ExamPicker
      first={profile?.full_name?.split(' ')[0] ?? null}
      variant={profile?.interface_mode ?? 'playful'}
      exams={exams.map((e, i) => ({ id: e.id, slug: e.slug, name: e.name, entitled: entitled[i] }))}
    />
  )
}
