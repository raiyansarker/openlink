import { AuthSession } from '#/lib/auth/client'
import type { SocialProvider } from '#/lib/auth/types'

type AuthClientError = { code?: string; message?: string; status?: number } | null | undefined

/** A failed profile action, with a message safe to show. */
export class ProfileError extends Error {
  constructor(
    message: string,
    readonly code: string | undefined,
  ) {
    super(message)
    this.name = 'ProfileError'
  }

  private static readonly BY_CODE: Record<string, string> = {
    INVALID_PASSWORD: 'Your current password is incorrect.',
    SESSION_EXPIRED: 'For your security, sign out and sign in again, then retry.',
    CREDENTIAL_ACCOUNT_NOT_FOUND: 'Your account does not use a password.',
    PASSWORD_TOO_SHORT: 'That password is too short.',
    PASSWORD_TOO_LONG: 'That password is too long.',
  }

  /** Better Auth codes get fixed wording; our own 400s already carry a readable message. */
  static from(error: AuthClientError, fallback: string): ProfileError {
    const code = error?.code
    if (code && ProfileError.BY_CODE[code]) return new ProfileError(ProfileError.BY_CODE[code]!, code)
    if (error?.status === 429) return new ProfileError('Too many attempts. Wait a moment and try again.', code)
    if (error?.status === 400 && error.message) return new ProfileError(error.message, code)
    return new ProfileError(fallback, code)
  }
}

export type LinkedAccounts = {
  /** Whether the account can sign in with a password (and so change it). */
  hasPassword: boolean
  providers: SocialProvider[]
}

/** The signed-in person's own account, via Better Auth. */
export class ProfileApi {
  private static async call<T>(
    run: () => Promise<{ data: T | null; error: AuthClientError }>,
    fallback: string,
  ): Promise<T> {
    let result: { data: T | null; error: AuthClientError }
    try {
      result = await run()
    } catch {
      throw new ProfileError('Could not reach the server. Check your connection.', 'NETWORK')
    }
    if (result.error || result.data === null) throw ProfileError.from(result.error, fallback)
    return result.data
  }

  /** Pictures change through `MediaUploads`, which stores them in R2. */
  static async updateProfile(changes: { name: string }): Promise<void> {
    await ProfileApi.call(() => AuthSession.client.updateUser(changes), 'Could not save your profile.')
    AuthSession.invalidate()
  }

  /** Other devices are signed out, since a password change usually means "lock everyone else out". */
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await ProfileApi.call(
      () => AuthSession.client.changePassword({ currentPassword, newPassword, revokeOtherSessions: true }),
      'Could not change your password.',
    )
  }

  /** Password-based accounts confirm with their password; others need a recent sign-in. */
  static async deleteAccount(password?: string): Promise<void> {
    await ProfileApi.call(
      () => AuthSession.client.deleteUser(password ? { password } : {}),
      'Could not delete your account.',
    )
    AuthSession.invalidate()
  }

  static async linkedAccounts(): Promise<LinkedAccounts> {
    const accounts = await ProfileApi.call(() => AuthSession.client.listAccounts(), 'Could not load your sign-in methods.')
    const ids = new Set(accounts.map((account) => account.providerId))
    return {
      hasPassword: ids.has('credential'),
      providers: (['google', 'github'] as const).filter((provider) => ids.has(provider)),
    }
  }
}
