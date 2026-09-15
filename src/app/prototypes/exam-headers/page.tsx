import { Container } from '@/components/container'
import { ExamSwitcher } from '@/components/exam-switcher'
import { SiteNav } from '@/components/site-nav'
import type { ExamLite } from '@/lib/exam/current'

const exams: ExamLite[] = [
  { id: 'preview-interviews', slug: 'interviews', name: 'Interviews', kind: 'interview' },
  { id: 'preview-ucat', slug: 'ucat', name: 'UCAT', kind: 'mcq' },
  { id: 'preview-gamsat', slug: 'gamsat', name: 'GAMSAT', kind: 'mcq' },
  { id: 'preview-isat', slug: 'isat', name: 'ISAT', kind: 'mcq' },
]
export default function ExamHeadersPreview() {
  return <main className="w-full py-8">
    <Container><h1 className="font-display text-3xl font-semibold">Exam headers</h1><p className="mt-2 text-muted">Student header preview for each exam.</p></Container>
    <div className="mt-8 space-y-8">{exams.map(exam => <section key={exam.slug} aria-label={`${exam.name} header`}>
      <header className="border-y border-border bg-surface/85">
        <Container className="flex h-16 items-center justify-between gap-3">
          <ExamSwitcher current={exam} exams={exams} />
          <SiteNav role="student" currentExamSlug={exam.slug} />
        </Container>
      </header>
    </section>)}</div>
  </main>
}
