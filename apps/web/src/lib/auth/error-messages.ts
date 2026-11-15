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
    return 'Incorrect email or password.'
  }
}
