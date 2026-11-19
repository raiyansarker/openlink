import { LoginRedirect } from '#/lib/auth/redirect'

import { ServerLog } from '../observability/server-log'
import { PendingVerifications } from './pending-verification'

const AUTH_PREFIX = '/api/auth'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

type AuthBody = { email: string | null; next: string | undefined }

/**
 * The address and the post-verification destination from a sign-up or sign-in body. The
 * app asks for `callbackURL: /verify-email?next=/invite/…`; only a same-origin path counts.
 */
async function readBody(request: Request): Promise<AuthBody> {
  const body = (await request.clone().json().catch(() => null)) as { email?: unknown; callbackURL?: unknown } | null
  const email = typeof body?.email === 'string' && body.email.trim() ? body.email.trim().toLowerCase() : null
  let next: string | undefined
  if (typeof body?.callbackURL === 'string') {
    const raw = new URL(body.callbackURL, 'http://openlink.invalid').searchParams.get('next')
    const safe = LoginRedirect.sanitize(raw, '')
    next = safe && safe !== LoginRedirect.DEFAULT ? safe : undefined
  }
  return { email, next }
}

const emailFrom = async (request: Request) => (await readBody(request)).email

function withCookie(response: Response, cookie: string) {
  const out = new Response(response.body, response)
  out.headers.append('set-cookie', cookie)
  return out
}

/**
 * Wraps Better Auth's handler to issue and honour the pending-verification cookie:
 *
 * - sign-up without a session (email needs verifying) issues it, with "a link was just sent";
 * - sign-in refused with `EMAIL_NOT_VERIFIED` (so the password was right) issues it, keeping
 *   the last send time for that address. Nothing is sent: the sign-up link still works;
 * - resending a verification link requires it, for the same address. Without it the request
 *   is answered like a normal success and nothing is sent, so a stranger (another browser,
 *   incognito) cannot trigger emails or learn anything;
 * - a successful sign-in or a clicked verification link clears it. A destination the app
 *   asked for at sign-up or sign-in (an invite page) is kept in it, and the verification
 *   redirect carries it on as `/verify-email?next=…`.
 */
export class VerificationGate {
  static async around(request: Request, secret: string, next: (request: Request) => Promise<Response>): Promise<Response> {
    const path = new URL(request.url).pathname.slice(AUTH_PREFIX.length)
    const now = Date.now()

    if (request.method === 'POST' && path === '/sign-up/email') {
      const { email, next: destination } = await readBody(request)
      const response = await next(request)
      if (!email || !response.ok) return response
      const data = (await response.clone().json().catch(() => null)) as { token?: string | null } | null
      if (data?.token) return response
      const sealed = await PendingVerifications.seal(secret, PendingVerifications.create(email, now, now, destination))
      return withCookie(response, PendingVerifications.setCookie(request, sealed))
    }

    if (request.method === 'POST' && path === '/sign-in/email') {
      const { email, next: destination } = await readBody(request)
      const response = await next(request)
      if (response.ok) return withCookie(response, PendingVerifications.clearCookie(request))
      if (!email || response.status !== 403) return response
      const error = (await response.clone().json().catch(() => null)) as { code?: string } | null
      if (error?.code !== 'EMAIL_NOT_VERIFIED') return response
      const existing = await PendingVerifications.open(secret, request, now)
      const same = existing?.email === email
      const sentAt = same ? existing.sentAt : 0
      const sealed = await PendingVerifications.seal(secret, PendingVerifications.create(email, sentAt, now, destination ?? (same ? existing.next : undefined)))
      return withCookie(response, PendingVerifications.setCookie(request, sealed))
    }

    if (request.method === 'POST' && path === '/send-verification-email') {
      const email = await emailFrom(request)
      const pending = await PendingVerifications.open(secret, request, now)
      if (!email || pending?.email !== email) {
        ServerLog.info('auth.verification_resend_ignored', { reason: pending ? 'email_mismatch' : 'no_pending_cookie' })
        return json({ status: true })
      }
      const response = await next(request)
      if (!response.ok) return response
      const sealed = await PendingVerifications.seal(secret, PendingVerifications.create(email, now, now, pending.next))
      return withCookie(response, PendingVerifications.setCookie(request, sealed))
    }

    if (request.method === 'GET' && path === '/verify-email') {
      const pending = await PendingVerifications.open(secret, request, now)
      const response = withCookie(await next(request), PendingVerifications.clearCookie(request))
      // Verified in the browser that signed up: carry on to where they were going (an invite).
      const location = response.headers.get('location')
      if (pending?.next && location === '/verify-email' && response.status >= 300 && response.status < 400) {
        response.headers.set('location', `/verify-email?next=${encodeURIComponent(pending.next)}`)
      }
      return response
    }

    return next(request)
  }
}
