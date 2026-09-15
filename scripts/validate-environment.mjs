import { existsSync,readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
const env={...(existsSync('.env.local')?parseEnv(readFileSync('.env.local','utf8')):{}),...process.env}
const requested=process.argv[2] || env.APP_ENV
const errors=[]
if(!['development','staging','production'].includes(requested)) errors.push('APP_ENV must explicitly identify development, staging, or production.')
if(env.APP_ENV!==requested) errors.push('APP_ENV does not match the requested environment.')
for(const key of ['NEXT_PUBLIC_SITE_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_EXPECTED_URL','PRODUCTION_SUPABASE_URL']) {
  try {
    const u=new URL(env[key])
    const local=u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)
    if(u.username||u.password||u.pathname!=='/'||u.search||u.hash||(!local&&u.protocol!=='https:'))throw Error()
  }
  catch {errors.push(`${key} must be a configured origin.`)}
}
for(const key of ['NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SECRET_KEY']) if(!env[key]?.trim()) errors.push(`${key} must be configured.`)
if(env.NEXT_PUBLIC_SUPABASE_URL!==env.SUPABASE_EXPECTED_URL) errors.push('Supabase URL does not match this environment’s expected project.')
if(requested!=='production' && env.NEXT_PUBLIC_SUPABASE_URL===env.PRODUCTION_SUPABASE_URL) errors.push('Non-production must not connect to production Supabase.')
if(requested==='production' && env.NEXT_PUBLIC_SUPABASE_URL!==env.PRODUCTION_SUPABASE_URL) errors.push('Production must use its dedicated Supabase project.')
if(requested!=='production' && env.NEXT_PUBLIC_SITE_URL==='https://studocyte.emeducate.com.au') errors.push('Non-production must not use the production callback domain.')
if(env.VERCEL_ENV==='preview' && requested==='production') errors.push('A preview deployment cannot use production configuration.')
if(env.VERCEL_ENV==='production' && requested!=='production') errors.push('Vercel production variables must not be used for local or staging work.')
if(env.VERCEL_TARGET_ENV==='production' && requested!=='production') errors.push('The Vercel production target must not use non-production configuration.')
if(env.VERCEL_TARGET_ENV==='staging' && requested!=='staging') errors.push('The Vercel staging target must use staging configuration.')
if(requested==='staging' && env.VERCEL_TARGET_ENV && !['staging','preview'].includes(env.VERCEL_TARGET_ENV)) errors.push('Staging must deploy to the Vercel staging or preview target.')
const mode=requested==='production'?'live':'test'
if(env.STRIPE_SECRET_KEY && !new RegExp(`^(sk|rk)_${mode}_`).test(env.STRIPE_SECRET_KEY)) errors.push(`Stripe must use ${mode} mode in this environment.`)
if(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && !env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith(`pk_${mode}_`)) errors.push(`Stripe publishable key must use ${mode} mode.`)
if(requested==='staging' && env.PAYMENTS_ENABLED==='true' && (!env.STRIPE_SECRET_KEY || !env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)) errors.push('Enabled staging payments require both Stripe test keys.')
for(const key of Object.keys(env)) if(key.startsWith('NEXT_PUBLIC_') && /SECRET|PRIVATE|SERVICE_ROLE|PASSWORD/.test(key)) errors.push(`${key} exposes a server-only credential to browsers.`)
if(errors.length){console.error('Environment validation failed:\n'+errors.map(e=>`- ${e}`).join('\n'));process.exitCode=1}
else console.log(`${requested} environment isolation checks passed. Account ownership and separate data still require verification.`)
