type AuthClientError = { code?: string; message?: string; status?: number } | null | undefined

const BY_CODE: Record<string, string> = {
  INVALID_PASSWORD: 'Your current password is incorrect.',
  SESSION_EXPIRED: 'For your security, sign out and sign in again, then retry.',
  CREDENTIAL_ACCOUNT_NOT_FOUND: 'Your account does not use a password.',
  PASSWORD_TOO_SHORT: 'That password is too short.',
  PASSWORD_TOO_LONG: 'That password is too long.',
}

/** Better Auth codes get fixed wording; our own 400s already carry a readable message. */
export function authErrorMessage(error: AuthClientError, fallback: string): string {
  const code = error?.code
  if (code && BY_CODE[code]) return BY_CODE[code]!
  if (error?.status === 429) return 'Too many attempts. Wait a moment and try again.'
  if (error?.status === 400 && error.message) return error.message
  return fallback
}

/**
 * Awaits a Better Auth client call (which returns `{ data, error }` instead of
 * throwing) and returns its data, or throws an Error with a message to show.
 */
export async function authCall<T>(
  call: Promise<{ data: T | null; error: AuthClientError }>,
  fallback: string,
): Promise<T> {
  let result: { data: T | null; error: AuthClientError }
  try {
    result = await call
  } catch {
    throw new Error('Could not reach the server. Check your connection.')
  }
  if (result.error || result.data === null) throw new Error(authErrorMessage(result.error, fallback))
  return result.data
}

/** Cache keys for what Better Auth (not oRPC) serves. */
export const AuthQueryKeys = {
  session: ['auth', 'session'],
  accounts: ['auth', 'accounts'],
  passkeys: ['auth', 'passkeys'],
} as const
