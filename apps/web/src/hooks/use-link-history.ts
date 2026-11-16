import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { LinkHistoryApi, type LinkHistoryKind } from '#/lib/api/link-history'
import { QueryKeys } from '#/lib/api/query'

const api = new LinkHistoryApi()

/**
 * One link's history as an endless list: the first page (with totals) loads
 * at once and `loadMore` adds older events. Refetched each time the History
 * tab opens.
 */
export function useLinkHistory(organizationId: string, linkId: string, kind: LinkHistoryKind | null) {
  const query = useInfiniteQuery({
    queryKey: [...QueryKeys.linkHistory(organizationId, linkId), kind ?? 'all'],
    queryFn: ({ pageParam }) => api.page({ organizationId, linkId }, kind, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
  const events = useMemo(() => query.data?.pages.flatMap((page) => page.events) ?? [], [query.data])
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
