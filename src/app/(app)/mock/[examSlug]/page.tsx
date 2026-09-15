import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageContainer as Container } from '@/components/container'
import { requireUser } from '@/lib/auth/dal'
import { createClient } from '@/lib/supabase/server'
import { canAccessExam } from '@/lib/access'
import { mocksForExam, UCAT_SECTIONS } from '@/lib/mock/config'
import { mockAssignmentCounts } from '@/lib/mock/resolve'

export const dynamic = 'force-dynamic'
export async function generateMetadata({ params }: { params: Promise<{ examSlug: string }> }): Promise<Metadata> {
  return { title: `Practice exams · ${(await params).examSlug.toUpperCase()}` }
}

export default async function MockExamPage({ params }: { params: Promise<{ examSlug: string }> }) {
  const user = await requireUser()
  const { examSlug } = await params
  const supabase = await createClient()
  const { data: exam } = await supabase.from('exams').select('id, name, slug').eq('slug', examSlug).maybeSingle()
  if (!exam) notFound()
  const mocks = mocksForExam(exam.slug)
  const entitled = await canAccessExam(user.id, exam.id)
  const counts = await mockAssignmentCounts(exam.id, mocks.map((mock) => mock.assignmentKey))

  return <Container><div className="w-full">
    <p className="text-sm text-muted"><Link href="/mock" className="hover:text-foreground">Practice exams</Link> / {exam.name}</p>
    <h1 className="page-title mt-2">Practice exams</h1>
    <p className="mt-3 max-w-2xl text-muted">Put your practice together in a full test-day rehearsal. Choose an exam below.</p>

    <section className="mt-8"><Eyebrow>Complete sitting</Eyebrow><h2 className="mt-1 font-display text-xl font-semibold">Full practice exams</h2>
      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-surface">{mocks.map((mock) => {
        const questions = mock.sections.reduce((sum, section) => sum + section.count, 0)
        const minutes = mock.sections.reduce((sum, section) => sum + section.minutes, 0)
        const ready = (counts[mock.assignmentKey] ?? 0) >= questions
        const open = mock.free || entitled
        const row = <ExamRow name={mock.name} free={mock.free} ready={ready} open={open} questions={questions} minutes={minutes} sections={mock.sections.length} />
        return <div key={mock.id} className="border-b border-border last:border-0">{ready ? <Link href={open ? `/mock/${exam.slug}/${mock.id}` : '/pricing'} className="eb-press group block transition-colors hover:bg-surface-muted">{row}</Link> : row}</div>
      })}</div>
    </section>
    {exam.slug === 'ucat' && <section className="mt-7"><Eyebrow>A shorter focus</Eyebrow><h2 className="mt-1 text-xl font-semibold">Section mini mocks</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{UCAT_SECTIONS.map(section => <Link key={section.subtestSlug} href={`/mock/${exam.slug}/mini/${section.subtestSlug}`} className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand/40"><span><strong className="block text-sm font-semibold">{section.name}</strong><span className="mt-1 block text-xs text-muted">Explore timed section practice</span></span><span aria-hidden className="text-brand">→</span></Link>)}</div></section>}
    <div className="mt-7 rounded-2xl border border-brand/15 bg-brand-muted/45 px-5 py-4 text-sm text-muted">Practice-exam questions are fixed and standardised. Ordinary question-bank sessions remain randomised. Prefer a flexible drill? <Link href={`/practice/${exam.slug}`} className="font-semibold text-brand hover:underline">Open Practice questions</Link>.</div>
  </div></Container>
}

function Eyebrow({ children }: { children: React.ReactNode }) { return <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-brand">{children}</p> }
function Status({ ready, text }: { ready: boolean; text: string }) { return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${ready ? 'bg-[#e5f5ee] text-[#237357]' : 'bg-surface-muted text-muted'}`}>{text}</span> }
function ExamRow({ name, free, ready, open, questions, minutes, sections }: { name: string; free: boolean; ready: boolean; open: boolean; questions: number; minutes: number; sections: number }) {
  return <div className="flex items-center gap-4 px-5 py-4"><span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-brand-muted text-brand"><ClipboardIcon /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{name}</span>{free && <span className="rounded-full bg-brand-muted px-2 py-0.5 text-[11px] font-semibold text-brand">Free</span>}</div><p className="mt-0.5 text-sm tabular-nums text-muted">{sections} sections · {questions} questions · {minutes} minutes</p></div>{!ready ? <Status ready={false} text="Questions coming soon" /> : open ? <span className="hidden text-sm font-semibold text-brand sm:block">Start →</span> : <Status ready={false} text="Unlock" />}</div>
}
function ClipboardIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="8" y="3" width="8" height="4" rx="1" /><path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><path d="M9 13h6M9 17h4" /></svg> }
