import { createHash, timingSafeEqual } from 'node:crypto'

const PBKDF2_ITERATIONS = 210_000
const PREFIX = 'pbkdf2-sha256'

function toBase64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString('base64url')
}

function fromBase64Url(value: string) {
  return new Uint8Array(Buffer.from(value, 'base64url'))
}

async function derivePbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt),
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  )

  return new Uint8Array(bits)
}

export async function hashLinkPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const derived = await derivePbkdf2(password, salt, PBKDF2_ITERATIONS)
  return `${PREFIX}$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(derived)}`
}

export async function verifyLinkPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false

  if (stored.startsWith(`${PREFIX}$`)) {
    const [, iterationsRaw, saltB64, hashB64] = stored.split('$')
    const iterations = Number(iterationsRaw)
    if (!Number.isFinite(iterations) || !saltB64 || !hashB64) return false

    const salt = fromBase64Url(saltB64)
    const expected = fromBase64Url(hashB64)
    const derived = await derivePbkdf2(password, salt, iterations)

    if (derived.length !== expected.length) return false
    return timingSafeEqual(derived, expected)
  }

  const legacy = createHash('sha256').update(password).digest('hex')
  if (legacy.length !== stored.length) return false
  return timingSafeEqual(Buffer.from(legacy), Buffer.from(stored))
}
