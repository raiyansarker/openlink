import { createHash, timingSafeEqual } from 'node:crypto'
import { Effect } from 'effect'
import { operation } from '#/server/effect/operations'

const PBKDF2_ITERATIONS = 210_000
const PREFIX = 'pbkdf2-sha256'

const toBase64Url = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url')
const fromBase64Url = (value: string) => new Uint8Array(Buffer.from(value, 'base64url'))

const derivePbkdf2 = (password: string, salt: Uint8Array, iterations: number) =>
  Effect.gen(function* () {
    const keyMaterial = yield* operation('password.importKey', () =>
      crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
        'deriveBits',
      ]),
    )
    const bits = yield* operation('password.deriveBits', () =>
      crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: new Uint8Array(salt), iterations, hash: 'SHA-256' },
        keyMaterial,
        256,
      ),
    )
    return new Uint8Array(bits)
  })

export const hashLinkPassword = (password: string) =>
  Effect.gen(function* () {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const derived = yield* derivePbkdf2(password, salt, PBKDF2_ITERATIONS)
    return `${PREFIX}$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(derived)}`
  })

export const verifyLinkPassword = (password: string, stored: string | null | undefined) =>
  Effect.gen(function* () {
    if (!stored) return false

    if (stored.startsWith(`${PREFIX}$`)) {
      const [, iterationsRaw, saltB64, hashB64] = stored.split('$')
      const iterations = Number(iterationsRaw)
      if (!Number.isFinite(iterations) || !saltB64 || !hashB64) return false

      const expected = fromBase64Url(hashB64)
      const derived = yield* derivePbkdf2(password, fromBase64Url(saltB64), iterations)
      return derived.length === expected.length && timingSafeEqual(derived, expected)
    }

    const legacy = createHash('sha256').update(password).digest('hex')
    return legacy.length === stored.length && timingSafeEqual(Buffer.from(legacy), Buffer.from(stored))
  })
