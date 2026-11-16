import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

import { ApiError } from './error'

/** Cache keys, grouped by workspace so one invalidation refreshes a whole area. */
export class QueryKeys {
  static readonly currentUser = ['me'] as const
  static readonly linkedAccounts = ['me', 'accounts'] as const
  static readonly deviceSessions = ['me', 'sessions'] as const
  static readonly passkeys = ['me', 'passkeys'] as const
  /** Workspace invites addressed to you: the Notifications inbox. */
  static readonly myInvites = ['me', 'invites'] as const
  static readonly organizations = ['organizations'] as const
  static workspace = (organizationId: string) => ['workspace', organizationId] as const
  static members = (organizationId: string) => [...QueryKeys.workspace(organizationId), 'members'] as const
  static domains = (organizationId: string) => [...QueryKeys.workspace(organizationId), 'domains'] as const
  static folders = (organizationId: string) => [...QueryKeys.workspace(organizationId), 'folders'] as const
  static links = (organizationId: string) => [...QueryKeys.workspace(organizationId), 'links'] as const
  static activity = (organizationId: string) => [...QueryKeys.workspace(organizationId), 'activity'] as const
  static linkHistory = (organizationId: string, linkId: string) =>
    [...QueryKeys.workspace(organizationId), 'history', linkId] as const
  static analytics = (organizationId: string, range: string, linkId: string | null) =>
    [...QueryKeys.workspace(organizationId), 'analytics', range, linkId ?? 'all'] as const
  static analyticsSummary = (organizationId: string) => [...QueryKeys.workspace(organizationId), 'analytics', 'summary'] as const
  static frameCheck = (organizationId: string, url: string) => [...QueryKeys.workspace(organizationId), 'frame-check', url] as const
  static recentClicks = (organizationId: string, linkId: string | null) =>
    [...QueryKeys.workspace(organizationId), 'analytics', 'recent', linkId ?? 'all'] as const
  static apiKeys = (organizationId: string) => [...QueryKeys.workspace(organizationId), 'api-keys'] as const
}

export class AppQueryClient {
  static readonly MAX_RETRIES = 2

  /** Do not retry what a retry cannot fix (auth, validation, not found). */
  static shouldRetry(failureCount: number, error: unknown) {
    return failureCount < AppQueryClient.MAX_RETRIES && ApiError.from(error).isRetryable
  }

  /** At most one membership re-check per this many ms, however many calls fail at once. */
  static readonly ACCESS_RECHECK_MS = 5_000

  static create() {
    let lastRecheck = 0
    /**
     * A 403 from any call can mean you were just removed from the workspace (or
     * your role changed). Re-read your workspaces, so the shell can move you out
     * of one you no longer belong to.
     */
    const onError = (error: unknown) => {
      if (ApiError.from(error).status !== 403) return
      const now = Date.now()
      if (now - lastRecheck < AppQueryClient.ACCESS_RECHECK_MS) return
      lastRecheck = now
      void client.invalidateQueries({ queryKey: QueryKeys.organizations })
    }
    const client: QueryClient = new QueryClient({
      queryCache: new QueryCache({ onError }),
      mutationCache: new MutationCache({ onError }),
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          refetchOnWindowFocus: false,
          retry: AppQueryClient.shouldRetry,
        },
      },
    })
    return client
  }
}
