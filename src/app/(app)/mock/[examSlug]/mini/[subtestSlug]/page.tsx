import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container } from '@/components/container'
import { requireUser } from '@/lib/auth/dal'
import { canAccessExam } from '@/lib/access'
import { MINI_MOCKS_PER_SECTION, findMiniMock, miniSection } from '@/lib/mock/config'
import { mockAssignmentCounts } from '@/lib/mock/resolve'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function MiniMockListPage({ params }: { params: Promise<{ examSlug: string; subtestSlug: string }> }) {
  const user = await requireUser()
  const { examSlug, subtestSlug } = await params
  const section = miniSection(examSlug, subtestSlug)
  if (!section) notFound()
  const supabase = await createClient()
  const { data: exam } = await supabase.from('exams').select('id, name, slug').eq('slug', examSlug).maybeSingle()
  if (!exam) notFound()
  const entitled = await canAccessExam(user.id, exam.id)
  const mocks = Array.from({ length: MINI_MOCKS_PER_SECTION }, (_, index) => findMiniMock(examSlug, subtestSlug, `mini-${index + 1}`)!)
  const counts = await mockAssignmentCounts(exam.id, mocks.map((mock) => mock.assignmentKey))

  return <Container className="py-10 sm:py-14"><div className="mx-auto max-w-3xl">
    <p className="text-sm text-muted"><Link href={`/mock/${examSlug}`} className="hover:text-foreground">Practice exams</Link> / Mini Mocks</p>
    <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">{section.name}</h1>
    <p className="mt-3 text-muted">Choose a standardised mini mock. Each form contains {section.count} questions and runs for {section.minutes} minutes.</p>
    <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">{mocks.map((mock, index) => {
      const ready = (counts[mock.assignmentKey] ?? 0) >= section.count
      const row = <div className="flex items-center gap-4 px-5 py-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-muted font-mono text-sm font-semibold text-brand">{index + 1}</span><div className="flex-1"><h2 className="font-semibold">Mini Mock {index + 1}</h2><p className="mt-0.5 text-sm text-muted">{section.count} questions · {section.minutes} minutes</p></div>{!ready ? <Pill>Questions coming soon</Pill> : entitled ? <span className="text-sm font-semibold text-brand">Start →</span> : <Pill>Unlock</Pill>}</div>
      return <div key={mock.id} className="border-b border-border last:border-0">{ready ? <Link href={entitled ? `/mock/${examSlug}/mini/${subtestSlug}/${mock.id}` : '/pricing'} className="eb-press block transition-colors hover:bg-surface-muted">{row}</Link> : row}</div>
    })}</div>
  </div></Container>
}

function Pill({ children }: { children: React.ReactNode }) { return <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-muted">{children}</span> }
