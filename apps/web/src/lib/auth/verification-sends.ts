/** Matches the server: at most one verification email per address per minute. */
export const VERIFICATION_RESEND_SECONDS = 60

const key = (email: string) => `openlink:verification-sent:${email.trim().toLowerCase()}`

/**
 * When this browser last asked for a verification email to `email`, so the resend
 * cooldown on `/check-email` survives a reload. Only a hint for the button: the
 * server enforces the real limits.
 */
export class VerificationSends {
  static record(email: string, at = Date.now()) {
    try {
      sessionStorage.setItem(key(email), String(at))
    } catch {
      // Storage can be unavailable (private mode, disabled); the cooldown just resets.
    }
  }

  /** Epoch ms when resending is allowed again; 0 when it already is. */
  static resendAt(email: string): number {
    try {
      const sentAt = Number(sessionStorage.getItem(key(email)))
      return Number.isFinite(sentAt) && sentAt > 0 ? sentAt + VERIFICATION_RESEND_SECONDS * 1000 : 0
    } catch {
      return 0
    }
  }
}
