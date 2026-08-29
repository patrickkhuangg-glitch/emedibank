import { NextResponse } from 'next/server'
import { getMux } from '@/lib/mux/client'
import { getMuxWebhookSecret } from '@/lib/mux/env'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('mux-signature') ?? ''

  let event
  try {
    event = await getMux().webhooks.unwrap(
      body,
      { 'mux-signature': signature },
      getMuxWebhookSecret(),
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (event.type === 'video.asset.ready') {
      const asset = event.data
      const questionId = asset.passthrough
      const playback =
        asset.playback_ids?.find((p) => p.policy === 'signed') ?? asset.playback_ids?.[0]
      if (questionId && playback) {
        const supabase = createAdminClient()
        await supabase
          .from('questions')
          .update({
            mux_asset_id: asset.id,
            mux_playback_id: playback.id,
            video_status: 'ready',
            video_duration_seconds: asset.duration ? Math.round(asset.duration) : null,
          })
          .eq('id', questionId)
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'handler error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
