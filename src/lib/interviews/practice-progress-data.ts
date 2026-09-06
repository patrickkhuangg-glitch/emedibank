import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { averageRating, logsInWeek, practiceDay, progressRange, shiftDay, suggestPractice, validProgressMonth, weekStart, type PracticeLog, type PracticeProgressData } from './practice-progress'

export async function loadPracticeProgress(userId: string, requestedMonth?: string): Promise<PracticeProgressData> {
  const today = practiceDay(new Date()), month = validProgressMonth(requestedMonth, today), range = progressRange(month)
  const unavailable: PracticeProgressData = { today, month, logs: [], available: false, suggestions: [], thisWeek: { count: 0, average: null, activeDays: 0 } }
  try {
    const db = await createClient()
    async function read(from: string, until: string) {
      const result: PracticeLog[] = []
      // Query one extra UTC day at each edge; Sydney day keys apply the exact boundary.
      for (let page = 0; page < 20; page++) {
        const { data, error } = await db.from('interview_practice_logs').select('id,station_id,format,source,completed_at,duration_seconds,self_rating').eq('user_id', userId).gte('completed_at', shiftDay(from, -1) + 'T00:00:00Z').lt('completed_at', until + 'T00:00:00Z').order('completed_at', { ascending: false }).order('id').range(page * 1000, page * 1000 + 999)
        if (error) throw new Error('Practice history unavailable')
        result.push(...(data ?? []))
        if ((data?.length ?? 0) < 1000) return result.filter(log => { const day = practiceDay(log.completed_at!); return day >= from && day < until })
      }
      throw new Error('Practice history exceeds the display window')
    }
    const [logs, recent] = await Promise.all([read(range.from, range.until), month === today.slice(0, 7) ? Promise.resolve(null) : read(shiftDay(today, -27), shiftDay(today, 1))])
    const current = recent ?? logs, thisWeek = logsInWeek(current, weekStart(today))
    return { today, month, logs, available: true, suggestions: suggestPractice(current, today), thisWeek: { count: thisWeek.length, average: averageRating(thisWeek), activeDays: new Set(thisWeek.map(log => practiceDay(log.completed_at!))).size } }
  } catch { return unavailable }
}
