'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import type { StudyPlanItemKind, StudyPlanStatus } from '@/lib/supabase/types'

const statuses = new Set<StudyPlanStatus>(['active', 'paused', 'completed'])
const kinds = new Set<StudyPlanItemKind>(['tutoring', 'masterclass', 'workshop', 'other'])
const unitLabels = new Set(['hours', 'sessions', 'places', 'credits'])

export async function createStudyPlanAction(formData: FormData) {
  const adminProfile = await requireAdmin()
  const email = value(formData, 'studentEmail').toLowerCase()
  const name = value(formData, 'name')
  if (!email || !name) throw new Error('Enter the student email and package name.')

  const admin = createAdminClient()
  const { data: users, error: usersError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (usersError) throw usersError
  const student = users.users.find((user) => user.email?.toLowerCase() === email)
  if (!student) throw new Error('No Studocyte account matches that email address.')

  const { data: plan, error } = await admin
    .from('study_plans')
    .insert({ user_id: student.id, name, created_by: adminProfile.id })
    .select('id')
    .single()
  if (error) throw error
  redirect(`/admin/study-plans/${plan.id}`)
}

export async function updateStudyPlanAction(formData: FormData) {
  await requireAdmin()
  const planId = value(formData, 'planId')
  const status = value(formData, 'status') as StudyPlanStatus
  const name = value(formData, 'name')
  if (!planId || !name || !statuses.has(status)) throw new Error('Check the package details and try again.')

  const { error } = await createAdminClient().from('study_plans').update({
    name,
    status,
    starts_on: nullableValue(formData, 'startsOn'),
    ends_on: nullableValue(formData, 'endsOn'),
    updated_at: new Date().toISOString(),
  }).eq('id', planId)
  if (error) throw error
  refresh(planId)
}

export async function addStudyPlanItemAction(formData: FormData) {
  await requireAdmin()
  const planId = value(formData, 'planId')
  const title = value(formData, 'title')
  const kind = value(formData, 'kind') as StudyPlanItemKind
  const unitLabel = value(formData, 'unitLabel')
  const totalUnits = numberValue(formData, 'totalUnits')
  if (!planId || !title || !kinds.has(kind) || !unitLabels.has(unitLabel) || totalUnits <= 0) {
    throw new Error('Check the inclusion details and try again.')
  }

  const { error } = await createAdminClient().from('study_plan_items').insert({
    plan_id: planId,
    title,
    kind,
    exam_scope: nullableValue(formData, 'examScope'),
    total_units: totalUnits,
    unit_label: unitLabel as 'hours' | 'sessions' | 'places' | 'credits',
  })
  if (error) throw error
  refresh(planId)
}

export async function updateStudyPlanItemAction(formData: FormData) {
  await requireAdmin()
  const planId = value(formData, 'planId')
  const itemId = value(formData, 'itemId')
  const title = value(formData, 'title')
  const kind = value(formData, 'kind') as StudyPlanItemKind
  const unitLabel = value(formData, 'unitLabel')
  const totalUnits = numberValue(formData, 'totalUnits')
  const usedUnits = numberValue(formData, 'usedUnits')
  if (!planId || !itemId || !title || !kinds.has(kind) || !unitLabels.has(unitLabel) || totalUnits <= 0 || usedUnits < 0 || usedUnits > totalUnits) {
    throw new Error('Used units must be between zero and the included amount.')
  }

  const { error } = await createAdminClient().from('study_plan_items').update({
    title,
    kind,
    exam_scope: nullableValue(formData, 'examScope'),
    total_units: totalUnits,
    used_units: usedUnits,
    unit_label: unitLabel as 'hours' | 'sessions' | 'places' | 'credits',
    updated_at: new Date().toISOString(),
  }).eq('id', itemId).eq('plan_id', planId)
  if (error) throw error
  refresh(planId)
}

export async function deleteStudyPlanItemAction(formData: FormData) {
  await requireAdmin()
  const planId = value(formData, 'planId')
  const itemId = value(formData, 'itemId')
  if (!planId || !itemId) return
  const { error } = await createAdminClient().from('study_plan_items').delete().eq('id', itemId).eq('plan_id', planId)
  if (error) throw error
  refresh(planId)
}

export async function archiveStudyPlanAction(formData: FormData) {
  await requireAdmin()
  const planId = value(formData, 'planId')
  if (!planId) return
  const { error } = await createAdminClient().from('study_plans').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', planId)
  if (error) throw error
  revalidatePath('/admin')
  revalidatePath('/admin/study-plans')
  revalidatePath(`/admin/study-plans/${planId}`)
  revalidatePath('/study-plan')
}

function refresh(planId: string) {
  revalidatePath('/admin')
  revalidatePath('/admin/study-plans')
  revalidatePath(`/admin/study-plans/${planId}`)
  revalidatePath('/study-plan')
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function nullableValue(formData: FormData, key: string) {
  const result = value(formData, key)
  return result || null
}

function numberValue(formData: FormData, key: string) {
  const result = Number(value(formData, key))
  return Number.isFinite(result) ? result : -1
}
