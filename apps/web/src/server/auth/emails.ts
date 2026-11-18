import type { WorkerBindings } from '../env'
import { EmailFormat } from '../email/format'
import { EmailQueue } from '../email/queue'

type Recipient = { email: string; name?: string | null }

/** Better Auth's token links are valid for one hour unless configured otherwise. */
const LINK_LIFETIME = '1 hour'

/**
 * The emails Better Auth triggers. Each one is queued, never sent inline,
 * so a slow provider cannot slow down sign-up or reset requests.
 */
export class AuthEmails {
  constructor(private readonly bindings: () => WorkerBindings) {}

  private static greeting(user: Recipient) {
    return user.name?.trim() || user.email
  }

  private appUrl(path: string) {
    return new URL(path, this.bindings().BETTER_AUTH_URL).toString()
  }

  verifyEmail(user: Recipient, verifyUrl: string) {
    return EmailQueue.send(this.bindings(), user.email, {
      template: 'email-verification',
      props: { name: AuthEmails.greeting(user), verifyUrl, expiresIn: LINK_LIFETIME },
    })
  }

  resetPassword(user: Recipient, resetUrl: string) {
    return EmailQueue.send(this.bindings(), user.email, {
      template: 'password-reset',
      props: { name: AuthEmails.greeting(user), resetUrl, expiresIn: LINK_LIFETIME },
    })
  }

  welcome(user: Recipient) {
    return EmailQueue.send(this.bindings(), user.email, {
      template: 'welcome',
      props: { name: AuthEmails.greeting(user), dashboardUrl: this.appUrl('/dashboard') },
    })
  }

  /** Sent after a password reset completes, so the owner notices if it was not them. */
  passwordChanged(user: Recipient, request: Request | undefined) {
    const cf = (request as unknown as { cf?: Record<string, unknown> } | undefined)?.cf
    return EmailQueue.send(this.bindings(), user.email, {
      template: 'security-alert',
      props: {
        name: AuthEmails.greeting(user),
        event: 'Your password was changed',
        device: EmailFormat.device(request?.headers.get('user-agent')),
        location: EmailFormat.location(cf),
        occurredAt: EmailFormat.dateTime(new Date()),
        securityUrl: this.appUrl('/settings/devices'),
      },
    })
  }
}
