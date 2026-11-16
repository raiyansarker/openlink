import { QueryClient } from '@tanstack/react-query'

import { ApiError } from './error'

/** Cache keys, grouped by workspace so one invalidation refreshes a whole area. */
export class QueryKeys {
  static readonly currentUser = ['me'] as const
  static readonly linkedAccounts = ['me', 'accounts'] as const
  static readonly deviceSessions = ['me', 'sessions'] as const
  static readonly organizations = ['organizations'] as const
  static workspace = (organizationId: string) => ['workspace', organizationId] as const
  static members = (organizationId: string) => [...QueryKeys.workspace(organizationId), 'members'] as const
  static domains = (organizationId: string) => [...QueryKeys.workspace(organizationId), 'domains'] as const
  static folders = (organizationId: string) => [...QueryKeys.workspace(organizationId), 'folders'] as const
  static links = (organizationId: string) => [...QueryKeys.workspace(organizationId), 'links'] as const
  static activity = (organizationId: string) => [...QueryKeys.workspace(organizationId), 'activity'] as const
  static comments = (organizationId: string, linkId: string) =>
    [...QueryKeys.workspace(organizationId), 'comments', linkId] as const
  static apiKeys = (organizationId: string) => [...QueryKeys.workspace(organizationId), 'api-keys'] as const
}

export class AppQueryClient {
  static readonly MAX_RETRIES = 2

  /** Do not retry what a retry cannot fix (auth, validation, not found). */
  static shouldRetry(failureCount: number, error: unknown) {
    return failureCount < AppQueryClient.MAX_RETRIES && ApiError.from(error).isRetryable
  }

  static create() {
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          refetchOnWindowFocus: false,
          retry: AppQueryClient.shouldRetry,
        },
      },
    })
  }
}
