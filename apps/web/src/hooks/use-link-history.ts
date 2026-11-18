import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { orpc } from '#/lib/api/orpc'
import { isShownInHistory } from '#/lib/links/history'

/** Kinds of link history the server can filter on. */
export type LinkHistoryKind = 'edits' | 'hold'

const PAGE_SIZE = 30

/**
 * One link's history as an endless list: the first page (with totals) loads
 * at once and `loadMore` adds older events.
 */
export function useLinkHistory(organizationId: string, linkId: string, kind: LinkHistoryKind | null) {
  const query = useInfiniteQuery(
    orpc.links.getWorkspaceLinkHistory.infiniteOptions({
      input: (cursor: string | undefined) => ({
        params: { organizationId, linkId },
        query: { limit: String(PAGE_SIZE), ...(kind ? { kind } : {}), ...(cursor ? { cursor } : {}) },
      }),
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }),
  )
  const events = useMemo(
    () => query.data?.pages.flatMap((page) => page.items.filter(isShownInHistory)) ?? [],
    [query.data],
  )
  return {
    events,
    summary: query.data?.pages[0]?.summary,
    isLoading: query.isPending,
    error: query.error,
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMore: () => void query.fetchNextPage(),
    retry: () => void query.refetch(),
  }
}
