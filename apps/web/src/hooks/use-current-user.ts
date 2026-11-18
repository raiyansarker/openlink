import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { AuthSession } from '#/lib/auth/client'
import { authCall, AuthQueryKeys } from '#/lib/auth/errors'
import type { SocialProvider } from '#/lib/auth/types'

/** The signed-in person, from the session. `user` is null while loading or when signed out. */
export function useCurrentUser() {
  const query = useQuery({ queryKey: AuthQueryKeys.session, queryFn: () => AuthSession.state() })
  return { user: query.data?.user ?? null, isLoading: query.isPending }
}

/** Re-read the session after the profile changes, so every screen shows the update. */
export function useRefreshCurrentUser() {
  const queryClient = useQueryClient()
  return useCallback(async () => {
    AuthSession.invalidate()
    await queryClient.invalidateQueries({ queryKey: AuthQueryKeys.session })
  }, [queryClient])
}

export type LinkedAccounts = {
  /** Whether the account can sign in with a password (and so change it). */
  hasPassword: boolean
  providers: SocialProvider[]
}

/** Module-level so `select` stays stable. */
function toLinkedAccounts(accounts: { providerId: string }[]): LinkedAccounts {
  const ids = new Set(accounts.map((account) => account.providerId))
  return {
    hasPassword: ids.has('credential'),
    providers: (['google', 'github'] as const).filter((provider) => ids.has(provider)),
  }
}

/** Which sign-in methods the account has (password and/or Google, GitHub). */
export function useLinkedAccounts() {
  return useQuery({
    queryKey: AuthQueryKeys.accounts,
    queryFn: () => authCall(AuthSession.client.listAccounts(), 'Could not load your sign-in methods.'),
    select: toLinkedAccounts,
  })
}
