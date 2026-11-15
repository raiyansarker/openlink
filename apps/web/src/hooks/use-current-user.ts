import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { QueryKeys } from '#/lib/api/query'
import { AuthSession } from '#/lib/auth/client'
import { ProfileApi } from '#/lib/profile/api'

/** The signed-in person, from the session. `user` is null while loading or when signed out. */
export function useCurrentUser() {
  const query = useQuery({ queryKey: QueryKeys.currentUser, queryFn: () => AuthSession.state() })
  return { user: query.data?.user ?? null, isLoading: query.isPending }
}

/** Re-read the session after the profile changes, so every screen shows the update. */
export function useRefreshCurrentUser() {
  const queryClient = useQueryClient()
  return useCallback(async () => {
    AuthSession.invalidate()
    await queryClient.invalidateQueries({ queryKey: QueryKeys.currentUser })
  }, [queryClient])
}

/** Which sign-in methods the account has (password and/or Google, GitHub). */
export function useLinkedAccounts() {
  return useQuery({ queryKey: QueryKeys.linkedAccounts, queryFn: () => ProfileApi.linkedAccounts() })
}
