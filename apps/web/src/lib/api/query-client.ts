import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

import { apiFailure, isRetryable } from './errors'
import { orpc } from './orpc'

export const MAX_RETRIES = 2

/** Do not retry what a retry cannot fix (auth, validation, not found). */
export function shouldRetry(failureCount: number, error: unknown) {
  return failureCount < MAX_RETRIES && isRetryable(error)
}

/** At most one membership re-check per this many ms, however many calls fail at once. */
const ACCESS_RECHECK_MS = 5_000

export function createQueryClient() {
  let lastRecheck = 0
  /**
   * A 403 from any call can mean you were just removed from the workspace (or
   * your role changed). Re-read your workspaces, so the shell can move you out
   * of one you no longer belong to.
   */
  const onError = (error: unknown) => {
    if (apiFailure(error).status !== 403) return
    const now = Date.now()
    if (now - lastRecheck < ACCESS_RECHECK_MS) return
    lastRecheck = now
    void client.invalidateQueries({ queryKey: orpc.organizations.listOrganizations.key() })
  }
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Coming back to the tab refreshes what's on screen if it's older than
        // `staleTime`, so teammates' changes show without a reload. Forms keep
        // their own drafts, so a refresh never overwrites what you're typing.
        refetchOnWindowFocus: true,
        retry: shouldRetry,
      },
    },
  })
  return client
}
