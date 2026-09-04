import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/container'
import { requireAdmin } from '@/lib/auth/dal'
import { SITE_URL } from '@/lib/site'
import { isZoomConfigured } from '@/lib/zoom/client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Admin · Zoom' }

export default async function ZoomSettingsPage() {
  await requireAdmin()
  const connected = isZoomConfigured()
  const webhookReady = Boolean(process.env.ZOOM_WEBHOOK_SECRET_TOKEN)
  const endpoint = `${SITE_URL}/api/zoom/webhook`

  return <Container className="py-10 sm:py-14"><main className="mx-auto max-w-3xl">
    <Link href="/admin" className="text-sm font-medium text-muted transition-colors hover:text-foreground">← Admin dashboard</Link>
    <header className="mt-5 border-b border-border pb-8"><h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Zoom tutoring</h1><p className="mt-3 max-w-2xl text-base leading-7 text-muted">Use your one Zoom Pro host to schedule sessions from a student package and track booked tutoring time.</p></header>

    <section className={`mt-8 rounded-3xl p-6 sm:p-8 ${connected && webhookReady ? 'bg-ink text-white' : 'border border-border bg-surface'}`}><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-display text-2xl font-bold tracking-tight">Connection status</h2><p className={`mt-2 text-sm ${connected && webhookReady ? 'text-white/70' : 'text-muted'}`}>{connected && webhookReady ? 'Zoom is ready to create sessions and receive attendance updates.' : 'Finish the one-time Server-to-Server OAuth setup to connect your Zoom Pro host.'}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${connected && webhookReady ? 'bg-mint-muted text-mint-deep' : 'bg-brand-muted text-brand'}`}>{connected && webhookReady ? 'Connected' : 'Setup needed'}</span></div></section>

    {!connected || !webhookReady ? <section className="mt-5 rounded-3xl border border-border bg-surface p-6 sm:p-8"><h2 className="font-display text-2xl font-bold tracking-tight">Connect your Zoom Pro account</h2><ol className="mt-6 space-y-5 text-sm leading-6 text-muted"><li><strong className="text-foreground">Create a Server-to-Server OAuth app</strong> in the <a className="font-semibold text-brand underline underline-offset-4" href="https://marketplace.zoom.us/develop/create" target="_blank" rel="noreferrer">Zoom Developer Marketplace</a>.</li><li><strong className="text-foreground">Add only these scopes:</strong> <code className="font-mono text-xs text-foreground">meeting:write:admin</code>, <code className="font-mono text-xs text-foreground">meeting:read:admin</code> and <code className="font-mono text-xs text-foreground">report:read:admin</code>.</li><li><strong className="text-foreground">Add these values to Vercel&rsquo;s production environment:</strong> <code className="font-mono text-xs text-foreground">ZOOM_ACCOUNT_ID</code>, <code className="font-mono text-xs text-foreground">ZOOM_CLIENT_ID</code>, <code className="font-mono text-xs text-foreground">ZOOM_CLIENT_SECRET</code>, <code className="font-mono text-xs text-foreground">ZOOM_HOST_USER_ID</code> (your licensed Zoom email) and <code className="font-mono text-xs text-foreground">ZOOM_WEBHOOK_SECRET_TOKEN</code>.</li><li><strong className="text-foreground">Subscribe to the</strong> <code className="font-mono text-xs text-foreground">meeting.ended</code> <strong className="text-foreground">event</strong> and use this endpoint:<span className="mt-2 block break-all rounded-2xl bg-surface-muted px-4 py-3 font-mono text-xs text-foreground">{endpoint}</span></li></ol><p className="mt-6 text-sm leading-6 text-muted">The secret values stay in Vercel. They are never stored in the database or sent to the browser.</p></section> : null}

    <section className="mt-5 rounded-3xl border border-border bg-surface p-6 sm:p-8"><h2 className="font-display text-2xl font-bold tracking-tight">How time is charged</h2><div className="mt-5 grid gap-4 sm:grid-cols-3"><Rule title="Late arrival" description="The booked time is charged once Zoom confirms the student attended."/><Rule title="Overrun" description="Only the booked time is charged automatically; extra minutes wait for your approval."/><Rule title="No match" description="If Zoom cannot verify the student attendance, nothing is deducted until you confirm it."/></div></section>
  </main></Container>
}

function Rule({ title, description }: { title: string; description: string }) { return <div><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted">{description}</p></div> }
