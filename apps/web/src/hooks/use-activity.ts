import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { ActivityApi, type ActivityFilters } from '#/lib/api/activity'
import { QueryKeys } from '#/lib/api/query'

const api = new ActivityApi()

/** New events show up on their own: the loaded pages refresh on this timer and on tab focus. */
const LIVE_REFRESH_MS = 30_000

/**
 * The workspace activity log as an endless list: the first page loads at
 * once, `fetchNextPage` adds older events using the server's cursor.
 */
export function useActivityFeed(organizationId: string, filters: ActivityFilters) {
  return useInfiniteQuery({
    queryKey: [...QueryKeys.activity(organizationId), 'feed', filters],
    queryFn: ({ pageParam }) => api.page(organizationId, filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchInterval: LIVE_REFRESH_MS,
    refetchOnWindowFocus: true,
  })
}

/** One member's latest actions, for their profile drawer. */
export function useMemberActivity(organizationId: string, userId: string | null, limit = 20) {
  return useQuery({
    queryKey: [...QueryKeys.activity(organizationId), 'member', userId, limit],
    queryFn: () => api.page(organizationId, { actor: userId! }, undefined, limit),
    enabled: userId != null,
  })
}

/** `value`, once it has stopped changing for `delayMs` (for search boxes). */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return settled
}
