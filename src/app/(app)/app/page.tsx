import type { Metadata } from 'next'
import { requireUser, getProfile } from '@/lib/auth/dal'
import { listExams } from '@/lib/exam/current'
import { hasActiveEntitlement } from '@/lib/access'
import { ExamPicker } from './exam-picker'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Choose your exam' }

export default async function ExamPickerPage() {
  const user = await requireUser('/app')
  const profile = await getProfile()
  const exams = await listExams()
  const entitled = await Promise.all(exams.map((e) => hasActiveEntitlement(user.id, e.id)))

  return (
    <ExamPicker
      first={profile?.full_name?.split(' ')[0] ?? null}
      exams={exams.map((e, i) => ({ id: e.id, slug: e.slug, name: e.name, entitled: entitled[i] }))}
    />
  )
}
