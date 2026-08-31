'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { EXAM_COOKIE } from './current'

/** Lock the session to an exam and drop the student onto its dashboard. */
export async function selectExamAction(slug: string) {
  const c = await cookies()
  c.set(EXAM_COOKIE, slug, {
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
    sameSite: 'lax',
  })
  redirect('/dashboard')
}
