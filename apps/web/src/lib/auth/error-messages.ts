/** User-facing text for sign-in failures. */
export class AuthErrorMessages {
  private static readonly OAUTH: Record<string, string> = {
    access_denied: 'Sign-in was cancelled.',
    account_not_linked:
      'An account with this email already exists. Sign in with the method you used originally.',
    email_not_found: 'The provider did not share an email address, which OpenLink needs.',
    unable_to_link_account: 'We could not link this sign-in to your account.',
    state_mismatch: 'That sign-in attempt expired. Please try again.',
    invalid_code: 'That sign-in attempt expired. Please try again.',
  }

  /** Message for an `?error=` code returned by the OAuth callback; unknown codes are never echoed. */
  static oauth(code: string | undefined): string | null {
    if (!code) return null
    return AuthErrorMessages.OAUTH[code.toLowerCase()] ?? 'Sign-in failed. Please try again.'
  }

  /** Message for a failed email sign-in; never reveals whether the email exists. */
  static emailSignIn(error: { status?: number; code?: string } | null | undefined): string {
    if (!error) return 'Sign-in failed. Please try again.'
    if (error.status === 429) return 'Too many attempts. Wait a moment and try again.'
    if (error.status && error.status >= 500) return 'Sign-in is unavailable right now. Please try again.'
    // Not a credentials problem: the request itself was refused (for example a blocked origin).
    if (error.status === 403) return 'Sign-in was blocked. Reload the page and try again.'
    return 'Incorrect email or password.'
  }

  /** Message for a failed email sign-up. */
  static emailSignUp(error: { status?: number; code?: string; message?: string } | null | undefined): string {
    if (!error) return 'Could not create the account. Please try again.'
    if (error.status === 429) return 'Too many attempts. Wait a moment and try again.'
    if (error.status && error.status >= 500) return 'Sign-up is unavailable right now. Please try again.'
    const code = error.code?.toUpperCase() ?? ''
    if (code.includes('ALREADY_EXISTS') || code.includes('USER_EXISTS')) {
      return 'An account with this email already exists. Sign in instead.'
    }
    if (code.includes('PASSWORD_TOO_SHORT')) return 'Use at least 8 characters for the password.'
    if (code.includes('PASSWORD_TOO_LONG')) return 'That password is too long.'
    if (code.includes('INVALID_EMAIL')) return 'Enter a valid email address.'
    return 'Could not create the account. Please try again.'
  }

  /**
   * Message for a failed passkey sign-in or registration. Cancelling the
   * browser prompt is not an error, so it returns null.
   */
  static passkey(error: { status?: number; code?: string; message?: string } | null | undefined): string | null {
    if (!error) return 'Passkey sign-in failed. Please try again.'
    const text = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
    if (text.includes('notallowed') || text.includes('cancel') || text.includes('aborted') || text.includes('timed out')) return null
    if (error.status === 429) return 'Too many attempts. Wait a moment and try again.'
    if (text.includes('not found') || error.status === 401) return 'That passkey is not registered with OpenLink. Sign in another way, then add it in your profile.'
    return 'Passkey sign-in failed. Please try again.'
  }
}
