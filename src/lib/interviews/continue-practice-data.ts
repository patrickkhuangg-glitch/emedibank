import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { mockMembership } from './mock-marking'
import type { FeedbackToRead } from './continue-practice'
type ReleasedResponse = { id: string; station_title: string; format: 'mmi' | 'panel'; released_at: string; mock_session: unknown }
const columns: string = 'id,station_title,format,released_at,mock_session:station_snapshot->mock_session'
// Only release metadata is needed on the dashboard; never fetch drafts or transcripts here.
export async function loadFeedbackToRead(userId: string): Promise<FeedbackToRead[]> {
  try {
    const db = await createClient()
    const [{ data, error }, { data: index, error: indexError }] = await Promise.all([
      db.from('interview_attempts').select(columns).eq('user_id', userId).eq('marking_status', 'released').not('released_at', 'is', null).order('released_at', { ascending: false }).limit(50).returns<ReleasedResponse[]>(),
      db.rpc('get_my_panel_report_index', {}),
    ])
    if (error) return []
    const panels = new Set((!indexError && Array.isArray(index) ? index : []).filter((p: { status: string }) => p.status === 'released').map((p: { sessionId: string }) => p.sessionId))
    const reports = new Map<string, FeedbackToRead>()
    for (const row of data ?? []) {
      const mock = mockMembership({ mock_session: row.mock_session }, row.format)
      if (indexError && row.format === 'panel' && mock) continue
      const wholePanel = row.format === 'panel' && mock && panels.has(mock.id)
      const id = wholePanel ? `panel:${mock.id}` : `attempt:${row.id}`
      if (!reports.has(id)) reports.set(id, { id, title: wholePanel ? 'Your full panel feedback' : row.station_title, href: `/interviews/mock-interviews/review?attempt=${encodeURIComponent(row.id)}`, releasedAt: row.released_at! })
    }
    return [...reports.values()]
  } catch { return [] }
}
