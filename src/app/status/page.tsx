import type { Metadata } from 'next'
import { Container } from '@/components/container'
import { createClient } from '@/lib/supabase/server'
import type { Exam } from '@/lib/supabase/types'

// Always read live at request time — this page proves the DB connection works.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Status',
  description: 'Health check — reads the exams table live from Supabase.',
}

type Result =
  | { ok: true; exams: Exam[] }
  | { ok: false; error: string }

async function checkDatabase(): Promise<Result> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) return { ok: false, error: error.message }
    return { ok: true, exams: data ?? [] }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

export default async function StatusPage() {
  const result = await checkDatabase()

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">System status</h1>
        <p className="mt-2 text-muted">
          End-to-end health check: the app reads the <code>exams</code> table
          directly from Supabase.
        </p>

        <div className="mt-8">
          {result.ok ? (
            <StatusPill ok label="Database connected" />
          ) : (
            <StatusPill ok={false} label="Database unreachable" />
          )}
        </div>

        {result.ok ? (
          <ExamsTable exams={result.exams} />
        ) : (
          <ErrorPanel error={result.error} />
        )}
      </div>
    </Container>
  )
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={
        ok
          ? 'inline-flex items-center gap-2 rounded-full bg-success-muted px-3 py-1 text-sm font-medium text-success'
          : 'inline-flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1 text-sm font-medium text-muted'
      }
    >
      <span
        aria-hidden
        className={`h-2 w-2 rounded-full ${ok ? 'bg-success' : 'bg-muted'}`}
      />
      {label}
    </span>
  )
}

function ExamsTable({ exams }: { exams: Exam[] }) {
  if (exams.length === 0) {
    return (
      <p className="mt-6 rounded-lg border border-border bg-surface p-6 text-muted">
        Connected, but no exams found. Apply the migration in{' '}
        <code>supabase/migrations</code> to seed GAMSAT.
      </p>
    )
  }

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-surface-muted text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Slug</th>
            <th className="px-4 py-3 font-medium">Kind</th>
            <th className="px-4 py-3 font-medium">Active</th>
          </tr>
        </thead>
        <tbody>
          {exams.map((exam) => (
            <tr key={exam.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium">{exam.name}</td>
              <td className="px-4 py-3 font-mono text-muted">{exam.slug}</td>
              <td className="px-4 py-3">{exam.kind}</td>
              <td className="px-4 py-3">{exam.active ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ErrorPanel({ error }: { error: string }) {
  return (
    <div className="mt-6 rounded-lg border border-border bg-surface p-6">
      <p className="text-sm text-muted">
        Could not read from Supabase. Check that <code>.env.local</code> has your
        project URL and keys, and that the migration in{' '}
        <code>supabase/migrations</code> has been applied.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-md bg-surface-muted p-4 font-mono text-xs text-foreground">
        {error}
      </pre>
    </div>
  )
}
