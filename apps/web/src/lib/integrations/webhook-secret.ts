export function randomWebhookPrefix(): string {
  const n = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0')
  return `whsec_live_${n}`
}

export function buildFullWebhookSecret(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  const tail = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${prefix}_${tail}`
}
