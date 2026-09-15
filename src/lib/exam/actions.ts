'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { EXAM_COOKIE } from './current'

/** Native form submission keeps exam selection usable before hydration. */
export async function selectExamFormAction(data: FormData) {
  const slug = data.get('exam')
  if (typeof slug !== 'string' || !slug.trim()) throw new Error('Choose an exam to continue.')
  await selectExamAction(slug)
}

/** Lock the session to an exam and drop the student onto its dashboard. */
export async function selectExamAction(slug: string) {
  const c = await cookies()
  c.set(EXAM_COOKIE, slug, {
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
    sameSite: 'lax',
  })
  redirect(slug === 'interviews' ? '/interviews' : '/dashboard')
}
