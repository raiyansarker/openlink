export function randomApiKeyPrefix(): string {
  const n = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0')
  return `ol_live_${n}`
}

export function randomApiKeySecretBody(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function buildFullApiKeySecret(prefix: string): string {
  return `${prefix}_${randomApiKeySecretBody()}`
}
