import { adminMfaIsVerified } from '@/lib/auth/admin-mfa'
import { getProfile } from '@/lib/auth/dal'
import { InterviewApiError, apiError } from '@/lib/interviews/api'
import { ProviderError, structuredInterviewRequest } from '@/lib/interviews/provider'
import { transcribeInterviewRecording } from '@/lib/interviews/transcription'

export const runtime = 'nodejs'
export const maxDuration = 300

const SYNTHETIC_STATION = {
  format: 'mmi' as const,
  station_id: 'staging-provider-check',
  title: 'Synthetic reflection check',
  preparation: 'Reflect on a disagreement in a group project.',
  questions: ['What did you do and what did you learn?'],
  evidence_scope: { completeness: 'complete', primary_task_coverage: 'full' },
}

const SYNTHETIC_TRANSCRIPT = [
  'Interviewer: What did you do and what did you learn?',
  'Candidate: I first asked each person to explain their concern without interruption. I summarised the shared deadline and the points we still disagreed on. We divided the remaining work according to availability, agreed on a short check-in, and I asked another member to confirm that the plan felt fair. The project was completed on time. I learned that I had moved to solutions too quickly, so I now clarify the problem and invite quieter members before proposing a plan.',
].join('\n')

function json(body: object, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

async function requireStagingAdmin(request: Request) {
  if (process.env.APP_ENV !== 'staging') throw new InterviewApiError('Not found.', 404)
  const profile = await getProfile()
  if (!profile) throw new InterviewApiError('Sign in required.', 401)
  if (profile.role !== 'admin') throw new InterviewApiError('Administrator access required.', 403)
  if (!await adminMfaIsVerified()) throw new InterviewApiError('Multi-factor verification required.', 403)
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    throw new InterviewApiError('Request origin is not allowed.', 403)
  }
}

export async function POST(request: Request) {
  try {
    await requireStagingAdmin(request)
    const contentType = request.headers.get('content-type') ?? ''
    if (contentType.startsWith('multipart/form-data')) {
      const form = await request.formData()
      const audio = form.get('audio')
      if (!(audio instanceof File) || audio.size < 64 || audio.size > 2_000_000) {
        throw new InterviewApiError('Supply a synthetic WAV file under 2 MB.', 400)
      }
      if (!['audio/wav', 'audio/x-wav'].includes(audio.type)) {
        throw new InterviewApiError('The provider check accepts WAV audio only.', 415)
      }
      const result = await transcribeInterviewRecording(audio, audio.type, 'synthetic-provider-check.wav')
      if ('error' in result) return json({ status: 'failed', check: 'transcription' }, 502)
      return json({
        status: 'passed',
        check: 'transcription',
        model: result.model,
        requestId: result.requestId ?? null,
        containsExpectedWords: /synthetic|transcription|staging/i.test(result.text),
      })
    }

    const body = await request.json().catch(() => null) as { check?: unknown } | null
    if (body?.check !== 'marking') throw new InterviewApiError('Choose a supported provider check.', 400)
    const assessment = await structuredInterviewRequest(
      'mmi_station',
      'assess',
      SYNTHETIC_STATION,
      SYNTHETIC_TRANSCRIPT,
    )
    const audit = await structuredInterviewRequest(
      'mmi_station',
      'audit',
      SYNTHETIC_STATION,
      SYNTHETIC_TRANSCRIPT,
      assessment.value,
    )
    return json({
      status: 'passed',
      check: 'marking',
      assessmentModel: assessment.model,
      auditModel: audit.model,
      assessmentRequestId: assessment.requestId ?? null,
      auditRequestId: audit.requestId ?? null,
    })
  } catch (error) {
    if (error instanceof ProviderError) return json({ status: 'failed', check: 'marking', reason: error.code }, 502)
    return apiError(error)
  }
}
