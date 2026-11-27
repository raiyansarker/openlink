import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { orpc } from '#/lib/api/orpc'
import type { ActivityCategory } from '#/lib/api/types'

export type ActivityFilters = {
  category?: ActivityCategory
  /** Free-text search, matched on the server. */
  q?: string
}

const PAGE_SIZE = 30

/** New events show up on their own: the loaded pages refresh on this timer and on tab focus. */
const LIVE_REFRESH_MS = 30_000

/**
 * The workspace activity log as an endless list: the first page loads at
 * once, `fetchNextPage` adds older events using the server's cursor.
 */
export function useActivityFeed(organizationId: string, filters: ActivityFilters) {
  const q = filters.q?.trim()
  return useInfiniteQuery(
    orpc.activity.listActivity.infiniteOptions({
      input: (cursor: string | undefined) => ({
        params: { organizationId },
        query: {
          limit: String(PAGE_SIZE),
          ...(cursor ? { cursor } : {}),
          ...(filters.category ? { category: filters.category } : {}),
          ...(q ? { q } : {}),
        },
      }),
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchInterval: LIVE_REFRESH_MS,
      refetchOnWindowFocus: true,
    }),
  )
}

/** One member's latest actions, for their profile drawer. */
export function useMemberActivity(organizationId: string, userId: string | null, limit = 20) {
  return useQuery(
    orpc.activity.listActivity.queryOptions({
      input: { params: { organizationId }, query: { limit: String(limit), actor: userId ?? '' } },
      enabled: userId != null,
    }),
  )
}

/** How long a search box waits after the last keystroke before it searches. */
export const QUERY_DEBOUNCE_MS = 300

/** `value`, once it has stopped changing for `delayMs` (for search boxes). */
export function useDebouncedValue<T>(value: T, delayMs = QUERY_DEBOUNCE_MS): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return settled
}
