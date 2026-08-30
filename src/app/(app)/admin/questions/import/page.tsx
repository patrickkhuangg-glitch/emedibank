import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/container'
import { requireAdmin } from '@/lib/auth/dal'
import { ImportForm } from './import-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Import questions' }

export default async function ImportPage() {
  await requireAdmin()
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <p className="text-sm text-muted"><Link href="/admin/questions" className="hover:text-foreground">Questions</Link> / Import</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Bulk import</h1>
          <p className="mt-1 text-muted">Fill in the template spreadsheet, export it as CSV, and drop it here.</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 text-sm leading-relaxed">
          <h2 className="font-semibold">Columns</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            <li><code>exam</code>, <code>subtest</code> — e.g. <code>UCAT</code>, <code>Verbal Reasoning</code> (must match exactly).</li>
            <li><code>type</code> — <code>mcq</code>, <code>passage</code>, <code>grid</code>, or <code>most_least</code>.</li>
            <li><code>stimulus_key</code> — any label (e.g. <code>VR1</code>). Rows sharing a key share one passage/scenario. Blank = standalone.</li>
            <li><code>passage</code>, <code>image_url</code>, <code>table</code> — the shared stimulus (put on the first row of a key). <code>table</code>: rows separated by <code>;</code>, cells by <code>|</code>, first row = headers.</li>
            <li><code>stem</code>, <code>tags</code> (comma-sep), <code>explanation</code>, <code>difficulty</code>, <code>published</code> (yes/no).</li>
            <li>MCQ: <code>option_a…option_e</code>, <code>correct</code> (a letter).</li>
            <li>Grid: <code>statements</code> = <code>Statement text :: Yes ; Next statement :: No ; …</code></li>
            <li>Most/Least: <code>actions</code> = <code>Action one ; Action two ; Action three</code>, then <code>most</code> and <code>least</code> = the action number.</li>
          </ul>
        </div>

        <ImportForm />
      </div>
    </Container>
  )
}
