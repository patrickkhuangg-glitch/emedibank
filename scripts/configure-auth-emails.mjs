// Applies only versioned email templates and subjects; never changes SMTP secrets.
import { readFileSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const project = process.argv.find(a => a.startsWith('--project='))?.slice(10)
if (!project || !/^[a-z]{20}$/.test(project)) throw new Error('Supply --project=<Supabase project reference>')
const subjects = JSON.parse(readFileSync(new URL('../supabase/templates/subjects.json', import.meta.url), 'utf8'))
const patch = {}
for (const [name, subject] of Object.entries(subjects)) {
  patch[`mailer_subjects_${name}`] = subject
  patch[`mailer_templates_${name}_content`] = readFileSync(new URL(`../supabase/templates/${name}.html`, import.meta.url), 'utf8')
}
if (!process.argv.includes('--apply')) {
  console.log('Prepared email templates: ' + Object.keys(subjects).join(', ') + '. Use --apply to publish.')
  process.exit(0)
}
let token = process.env.SUPABASE_ACCESS_TOKEN
if (!token && process.platform === 'darwin') for (const account of ['access-token', 'supabase']) {
  try { token = (await promisify(execFile)('security', ['find-generic-password', '-s', 'Supabase CLI', '-a', account, '-w'], { timeout: 15000 })).stdout.trim(); if (token) break } catch { /* Try the CLI's alternate keychain account. */ }
}
if (!token) throw new Error('Sign in with the Supabase CLI or supply SUPABASE_ACCESS_TOKEN in memory')
const endpoint = `https://api.supabase.com/v1/projects/${project}/config/auth`
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
const before = await fetch(endpoint, { headers, signal: AbortSignal.timeout(30000) })
if (!before.ok) throw new Error('Could not read existing auth configuration: ' + before.status)
const previous = await before.json()
const response = await fetch(endpoint, { method: 'PATCH', headers, body: JSON.stringify(patch), signal: AbortSignal.timeout(30000) })
if (!response.ok) throw new Error('Email template update failed: ' + response.status)
const verification = await fetch(endpoint, { headers, signal: AbortSignal.timeout(30000) })
if (!verification.ok) throw new Error('Could not verify email templates')
const current = await verification.json()
if (Object.entries(patch).some(([key, value]) => current[key] !== value)) throw new Error('Live email templates do not match the intended configuration')
for (const key of ['site_url', 'uri_allow_list', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_admin_email', 'smtp_sender_name']) {
  if (current[key] !== previous[key]) throw new Error('An unrelated configuration field changed: ' + key)
}
console.log('Verified all four branded email templates and subjects. Existing SMTP and redirect settings preserved. No email sent.')
