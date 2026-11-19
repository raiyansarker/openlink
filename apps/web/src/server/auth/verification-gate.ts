import { ServerLog } from '../observability/server-log'
import { PendingVerifications } from './pending-verification'

const AUTH_PREFIX = '/api/auth'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

async function emailFrom(request: Request): Promise<string | null> {
  const body = (await request.clone().json().catch(() => null)) as { email?: unknown } | null
  return typeof body?.email === 'string' && body.email.trim() ? body.email.trim().toLowerCase() : null
}

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
 * - a successful sign-in or a clicked verification link clears it.
 */
export class VerificationGate {
  static async around(request: Request, secret: string, next: (request: Request) => Promise<Response>): Promise<Response> {
    const path = new URL(request.url).pathname.slice(AUTH_PREFIX.length)
    const now = Date.now()

    if (request.method === 'POST' && path === '/sign-up/email') {
      const email = await emailFrom(request)
      const response = await next(request)
      if (!email || !response.ok) return response
      const data = (await response.clone().json().catch(() => null)) as { token?: string | null } | null
      if (data?.token) return response
      const sealed = await PendingVerifications.seal(secret, PendingVerifications.create(email, now, now))
      return withCookie(response, PendingVerifications.setCookie(request, sealed))
    }

    if (request.method === 'POST' && path === '/sign-in/email') {
      const email = await emailFrom(request)
      const response = await next(request)
      if (response.ok) return withCookie(response, PendingVerifications.clearCookie(request))
      if (!email || response.status !== 403) return response
      const error = (await response.clone().json().catch(() => null)) as { code?: string } | null
      if (error?.code !== 'EMAIL_NOT_VERIFIED') return response
      const existing = await PendingVerifications.open(secret, request, now)
      const sentAt = existing?.email === email ? existing.sentAt : 0
      const sealed = await PendingVerifications.seal(secret, PendingVerifications.create(email, sentAt, now))
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
      const sealed = await PendingVerifications.seal(secret, PendingVerifications.create(email, now, now))
      return withCookie(response, PendingVerifications.setCookie(request, sealed))
    }

    if (request.method === 'GET' && path === '/verify-email') {
      return withCookie(await next(request), PendingVerifications.clearCookie(request))
    }

    return next(request)
  }
}
