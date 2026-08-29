function req(name: string, v: string | undefined): string {
  if (!v) throw new Error(`Missing environment variable ${name}. See .env.example.`)
  return v
}
export const getMuxTokenId = () => req('MUX_TOKEN_ID', process.env.MUX_TOKEN_ID)
export const getMuxTokenSecret = () => req('MUX_TOKEN_SECRET', process.env.MUX_TOKEN_SECRET)
export const getMuxSigningKeyId = () => req('MUX_SIGNING_KEY_ID', process.env.MUX_SIGNING_KEY_ID)
export const getMuxSigningKeyPrivate = () =>
  req('MUX_SIGNING_KEY_PRIVATE', process.env.MUX_SIGNING_KEY_PRIVATE)
export const getMuxWebhookSecret = () =>
  req('MUX_WEBHOOK_SECRET', process.env.MUX_WEBHOOK_SECRET)
