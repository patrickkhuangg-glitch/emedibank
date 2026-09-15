import Link from 'next/link'
import { PageContainer as Container } from '@/components/container'

export const metadata = { title: 'Interview free trial', description: 'What is included in your seven-day interview trial and how we protect your information.' }

export default function InterviewTrialDetails() {
  return <Container><article className="space-y-6 text-sm leading-7 text-muted [&>p]:max-w-prose [&>ul]:max-w-prose">
    <h1 className="page-title text-foreground">Your interview free trial</h1>
    <p>Your seven days start when you first begin a practice response or mock. No card is required and the free interview trial does not renew into a paid subscription. You can subscribe immediately or upgrade at any time.</p>
    <h2 className="text-xl font-semibold text-foreground">What’s included</h2>
    <ul className="list-disc space-y-2 pl-5"><li>15 MMI stations and one question from each of the 32 panel themes.</li><li>One two-station MMI mock and one 20-minute panel mock: ten themes, starting with Motivation for Medicine.</li><li>60 minutes of saved transcription and two marking credits, enough for one MMI station. Full-mock marking costs 12 credits.</li><li>Record, listen back and download on your device as often as you like during the trial. Cloud saves are limited to 60 responses and 512 MiB in total, with up to 128 MiB per video or 24 MiB per audio recording.</li><li>Up to 100 saved stories and 500 short study notes.</li></ul>
    <p>Deleting saved work does not refill trial allowances. Each person should use one account; repeated trials and duplicate recordings do not create new allowances. Trial processing may pause temporarily when our shared processing allowance is reached. Paid practice uses its own processing queue.</p>
    <h2 className="text-xl font-semibold text-foreground">Your saved work and privacy</h2>
    <p>Recordings and their private backups expire after seven days. If a recording is awaiting marking, we keep it until review is finished. Download anything you want to keep. Your transcripts, stories and released feedback stay readable after the trial ends and are retained until your account is deactivated.</p>
    <p>To prevent repeat trials, we keep a protected, one-way identifier derived from your verified email address. It cannot be used to read your email address and is not shown to other students. This anti-abuse identifier remains after account deletion while we operate the one-trial offer; it contains no recording or transcript. Contact support about privacy or deletion requests.</p>
    <p>Submitted marking is reviewed by a tutor before feedback is released. The two welcome credits remain in your account after the trial ends; they are not a recurring allowance.</p>
    <div className="flex flex-wrap gap-4 font-semibold text-brand"><Link href="/interview-preparation">Try Interviews free →</Link><Link href="/interview-preparation#plans">Explore Interview plans →</Link><a href="mailto:support@emeducate.com.au">Contact support</a></div>
    <p><a className="underline" href="https://emeducate.com.au/privacy">Full privacy policy</a></p>
  </article></Container>
}
