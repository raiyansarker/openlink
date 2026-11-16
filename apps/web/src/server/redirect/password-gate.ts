import type { link } from '@openlink/db/schema'
import { Effect } from 'effect'

import { operation } from '#/server/effect/operations'

type LinkRow = typeof link.$inferSelect

/** Anything with Cloudflare's rate-limit binding shape. */
export type AttemptLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> }

/**
 * Remembers that a visitor knows a link's password, and caps guesses.
 *
 * After a correct password the visitor gets a signed cookie scoped to the
 * link's path, so reopening the link skips the form for a while. The signature
 * covers the stored password hash, so changing or clearing the password
 * signs everyone out of that link at once.
 */
export class PasswordGate {
  static readonly REMEMBER_SECONDS = 12 * 60 * 60

  static cookieName(row: Pick<LinkRow, 'id'>): string {
    return `ol_pw_${row.id.replace(/[^A-Za-z0-9_-]/g, '')}`
  }

  /** A `Set-Cookie` value proving this visitor knows the password until it expires. */
  static remember(row: LinkRow, secret: string, now = new Date()) {
    return Effect.gen(function* () {
      const expiresAt = Math.floor(now.getTime() / 1000) + PasswordGate.REMEMBER_SECONDS
      const signature = yield* PasswordGate.sign(row, expiresAt, secret)
      return [
        `${PasswordGate.cookieName(row)}=${expiresAt}.${signature}`,
        `Path=/${encodeURIComponent(row.slug)}`,
        `Max-Age=${PasswordGate.REMEMBER_SECONDS}`,
        'HttpOnly',
        'Secure',
        'SameSite=Lax',
      ].join('; ')
    })
  }

  /** Whether the request carries a valid, unexpired proof for this link. */
  static isRemembered(row: LinkRow, cookieHeader: string | null, secret: string, now = new Date()) {
    return Effect.gen(function* () {
      if (!row.passwordHash || !cookieHeader) return false
      const value = PasswordGate.readCookie(cookieHeader, PasswordGate.cookieName(row))
      const match = value?.match(/^(\d+)\.([A-Za-z0-9_-]+)$/)
      if (!match) return false
      const expiresAt = Number(match[1])
      if (expiresAt * 1000 <= now.getTime()) return false
      const expected = yield* PasswordGate.sign(row, expiresAt, secret)
      return PasswordGate.equal(expected, match[2]!)
    })
  }

  /**
   * Count a password attempt against this link and client. False means too
   * many recently. A limiter outage never locks people out.
   */
  static allowAttempt(limiter: AttemptLimiter | undefined, row: Pick<LinkRow, 'id'>, clientIp: string | null) {
    if (!limiter) return Effect.succeed(true)
    return operation('redirect.passwordLimit', () => limiter.limit({ key: `${row.id}:${clientIp ?? 'unknown'}` })).pipe(
      Effect.map((outcome) => outcome.success),
      Effect.orElseSucceed(() => true),
    )
  }

  static readCookie(header: string, name: string): string | null {
    for (const part of header.split(';')) {
      const [key, ...rest] = part.trim().split('=')
      if (key === name) return rest.join('=')
    }
    return null
  }

  private static sign(row: LinkRow, expiresAt: number, secret: string) {
    return operation('redirect.passwordSign', async () => {
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign',
      ])
      const data = new TextEncoder().encode(`link-password|${row.id}|${row.passwordHash ?? ''}|${expiresAt}`)
      const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, data))
      return Buffer.from(signature).toString('base64url')
    })
  }

  private static equal(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    return diff === 0
  }
}
