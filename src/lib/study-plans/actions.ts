'use server'

import { revalidatePath } from 'next/cache'
import { getProfile, requireAdmin, requireUser } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import type { StudyPlanItemKind, StudyPlanStatus } from '@/lib/supabase/types'

const statuses = new Set<StudyPlanStatus>(['active', 'paused', 'completed'])
const kinds = new Set<StudyPlanItemKind>(['tutoring', 'masterclass', 'workshop', 'other'])
const unitLabels = new Set(['hours', 'sessions', 'places', 'credits'])

export type CreateStudyPlanState = { error?: string; planId?: string }
export type StudyPlanActionState = { error?: string; success?: string }

export async function createStudyPlanAction(_previous: CreateStudyPlanState, formData: FormData): Promise<CreateStudyPlanState> {
  const adminProfile = await getProfile()
  if (adminProfile?.role !== 'admin') return { error: 'Only admins can create student packages.' }
  const email = value(formData, 'studentEmail').toLowerCase()
  const name = value(formData, 'name')
  if (!email || !name) return { error: 'Enter the student email and package name.' }

  const admin = createAdminClient()
  const { data: users, error: usersError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (usersError) {
    console.error('Could not list Studocyte users for a study plan.', usersError)
    return { error: 'Unable to check student accounts right now. Please refresh and try again.' }
  }
  const student = users.users.find((user) => user.email?.toLowerCase() === email)
  if (!student) return { error: 'No Studocyte account matches that email. Create the student account first, then return here to add their package.' }

  const { data: plan, error } = await admin
    .from('study_plans')
    .insert({ user_id: student.id, name, created_by: adminProfile.id })
    .select('id')
    .single()
  if (error || !plan) {
    console.error('Could not create a student study plan.', error)
    return { error: 'The package could not be created. Please try again.' }
  }
  refresh(plan.id)
  return { planId: plan.id }
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

export async function saveStudyPlanExamDateAction(_previous: StudyPlanActionState, formData: FormData): Promise<StudyPlanActionState> {
  const user = await requireUser('/study-plan')
  try {
    const dateId = value(formData, 'dateId')
    const examId = value(formData, 'examId')
    const examDate = value(formData, 'examDate')
    if (!examId || !isIsoDate(examDate)) return { error: 'Choose a valid exam and date.' }

    const admin = createAdminClient()
    const exam = await requireUnlockedExam(user.id, examId)
    const label = exam.kind === 'interview' ? value(formData, 'label') : 'Exam day'
    if (!label || label.length > 80) return { error: 'Give this interview date a short label.' }

    const updatedAt = new Date().toISOString()
    const request = dateId
      ? admin.from('study_plan_exam_dates').update({ label, exam_date: examDate, updated_at: updatedAt }).eq('id', dateId).eq('user_id', user.id).eq('exam_id', examId)
      : admin.from('study_plan_exam_dates').upsert({ user_id: user.id, exam_id: examId, label, exam_date: examDate, updated_at: updatedAt }, { onConflict: 'user_id,exam_id,label' })
    const { error } = await request
    if (error) throw error
    revalidatePath('/study-plan')
    return { success: dateId ? 'Date updated.' : 'Date added.' }
  } catch (error) {
    console.error('Could not save a study-plan exam date.', error)
    return { error: 'The date could not be saved. Check it and try again.' }
  }
}

export async function deleteStudyPlanExamDateAction(_previous: StudyPlanActionState, formData: FormData): Promise<StudyPlanActionState> {
  const user = await requireUser('/study-plan')
  try {
    const dateId = value(formData, 'dateId')
    if (!dateId) return { error: 'Choose a date to remove.' }
    const { error } = await createAdminClient().from('study_plan_exam_dates').delete().eq('id', dateId).eq('user_id', user.id)
    if (error) throw error
    revalidatePath('/study-plan')
    return { success: 'Date removed.' }
  } catch (error) {
    console.error('Could not remove a study-plan exam date.', error)
    return { error: 'The date could not be removed. Try again.' }
  }
}

export async function addStudyPlanTaskAction(_previous: StudyPlanActionState, formData: FormData): Promise<StudyPlanActionState> {
  const user = await requireUser('/study-plan')
  try {
    const body = value(formData, 'body')
    const examId = nullableValue(formData, 'examId')
    if (!body || body.length > 240) return { error: 'Write a note between 1 and 240 characters.' }
    if (examId) await requireUnlockedExam(user.id, examId)

    const { error } = await createAdminClient().from('study_plan_tasks').insert({ user_id: user.id, exam_id: examId, body })
    if (error) throw error
    revalidatePath('/study-plan')
    return { success: 'Added to your checklist.' }
  } catch (error) {
    console.error('Could not add a study-plan task.', error)
    return { error: 'That item could not be added. Try again.' }
  }
}

export async function toggleStudyPlanTaskAction(_previous: StudyPlanActionState, formData: FormData): Promise<StudyPlanActionState> {
  const user = await requireUser('/study-plan')
  try {
    const taskId = value(formData, 'taskId')
    const isCompleted = value(formData, 'isCompleted') === 'true'
    if (!taskId) return { error: 'Choose an item to update.' }
    const { error } = await createAdminClient().from('study_plan_tasks').update({ is_completed: isCompleted, updated_at: new Date().toISOString() }).eq('id', taskId).eq('user_id', user.id)
    if (error) throw error
    revalidatePath('/study-plan')
    return { success: isCompleted ? 'Task completed.' : 'Task reopened.' }
  } catch (error) {
    console.error('Could not update a study-plan task.', error)
    return { error: 'That item could not be updated. Try again.' }
  }
}

export async function deleteStudyPlanTaskAction(_previous: StudyPlanActionState, formData: FormData): Promise<StudyPlanActionState> {
  const user = await requireUser('/study-plan')
  try {
    const taskId = value(formData, 'taskId')
    if (!taskId) return { error: 'Choose an item to remove.' }
    const { error } = await createAdminClient().from('study_plan_tasks').delete().eq('id', taskId).eq('user_id', user.id)
    if (error) throw error
    revalidatePath('/study-plan')
    return { success: 'Item removed.' }
  } catch (error) {
    console.error('Could not remove a study-plan task.', error)
    return { error: 'That item could not be removed. Try again.' }
  }
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

function isIsoDate(input: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(input) && !Number.isNaN(new Date(`${input}T12:00:00`).getTime())
}

async function requireUnlockedExam(userId: string, examId: string) {
  const admin = createAdminClient()
  const nowIso = new Date().toISOString()
  const [{ data: exam }, { data: entitlement }] = await Promise.all([
    admin.from('exams').select('id,name,kind').eq('id', examId).eq('active', true).maybeSingle(),
    admin.from('entitlements').select('id').eq('user_id', userId).eq('exam_id', examId).or(`expires_at.is.null,expires_at.gt.${nowIso}`).limit(1).maybeSingle(),
  ])
  if (!exam || !entitlement) throw new Error('That exam is not currently unlocked on your account.')
  return exam
}
