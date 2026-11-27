/**
 * A short-lived, signed, HttpOnly cookie that says "this browser just signed up, or just
 * signed in with the right password, as <email>, and that email is not verified yet".
 *
 * It gates `/check-email` and the resend endpoint, so neither can be used for an address
 * this browser has not proven anything about. It also carries when a link was last
 * requested, so the resend countdown comes from the server, not the browser.
 */

/** HttpOnly, so scripts never see it. */
export const PENDING_VERIFICATION_COOKIE = 'openlink.pending_verification'

/** Matches the verification link's lifetime. */
const MAX_AGE_SECONDS = 60 * 60

/** Matches the server's per-address limit: one verification email a minute. */
export const RESEND_INTERVAL_MS = 60 * 1000

export type PendingVerification = {
  email: string
  /** When a link was last requested from this browser (epoch ms); 0 when unknown. */
  sentAt: number
  /** When the cookie stops counting (epoch ms). */
  expiresAt: number
  /** Where to go once verified (a same-origin path, e.g. `/invite/…`); absent means the app. */
  next?: string
}

const encoder = new TextEncoder()

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const fromBase64url = (value: string) => {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(`pending-verification:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
}

export class PendingVerifications {
  static async seal(secret: string, value: PendingVerification): Promise<string> {
    const payload = base64url(encoder.encode(JSON.stringify(value)))
    const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(payload)))
    return `${payload}.${base64url(signature)}`
  }

  /** The cookie's value if it is present, correctly signed and not expired; otherwise null. */
  static async open(secret: string, request: Request, now = Date.now()): Promise<PendingVerification | null> {
    const raw = PendingVerifications.read(request)
    if (!raw) return null
    const [payload, signature] = raw.split('.')
    if (!payload || !signature) return null
    try {
      const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromBase64url(signature), encoder.encode(payload))
      if (!valid) return null
      const value = JSON.parse(new TextDecoder().decode(fromBase64url(payload))) as Partial<PendingVerification>
      if (typeof value.email !== 'string' || typeof value.sentAt !== 'number' || typeof value.expiresAt !== 'number') return null
      if (value.expiresAt <= now) return null
      return { email: value.email, sentAt: value.sentAt, expiresAt: value.expiresAt, ...(typeof value.next === 'string' ? { next: value.next } : {}) }
    } catch {
      return null
    }
  }

  /** A fresh value for `email`, valid for an hour from `now`. */
  static create(email: string, sentAt: number, now = Date.now(), next?: string): PendingVerification {
    return { email: email.trim().toLowerCase(), sentAt, expiresAt: now + MAX_AGE_SECONDS * 1000, ...(next ? { next } : {}) }
  }

  static setCookie(request: Request, sealed: string) {
    return PendingVerifications.serialize(request, sealed, MAX_AGE_SECONDS)
  }

  static clearCookie(request: Request) {
    return PendingVerifications.serialize(request, '', 0)
  }

  /** Epoch ms when another link may be requested; `sentAt` 0 means right away. */
  static resendAt(value: PendingVerification) {
    return value.sentAt ? value.sentAt + RESEND_INTERVAL_MS : 0
  }

  private static read(request: Request) {
    for (const part of (request.headers.get('cookie') ?? '').split(';')) {
      const [name, ...rest] = part.trim().split('=')
      if (name === PENDING_VERIFICATION_COOKIE) return rest.join('=')
    }
    return null
  }

  private static serialize(request: Request, value: string, maxAge: number) {
    const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
    return `${PENDING_VERIFICATION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
  }
}
