function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable ${name}. See .env.example.`)
  return value
}
export function getStripeSecretKey() {
  return required('STRIPE_SECRET_KEY', process.env.STRIPE_SECRET_KEY)
}
export function getStripeWebhookSecret() {
  return required('STRIPE_WEBHOOK_SECRET', process.env.STRIPE_WEBHOOK_SECRET)
}
