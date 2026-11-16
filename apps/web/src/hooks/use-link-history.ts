import { useQuery } from '@tanstack/react-query'

import { LinkHistoryApi } from '#/lib/api/link-history'
import { QueryKeys } from '#/lib/api/query'

const api = new LinkHistoryApi()

/** One link's history, refetched each time the History tab opens. */
export function useLinkHistory(organizationId: string, linkId: string) {
  const history = useQuery({
    queryKey: QueryKeys.linkHistory(organizationId, linkId),
    queryFn: () => api.list({ organizationId, linkId }),
  })
  return {
    events: history.data ?? [],
    isLoading: history.isPending,
    error: history.error,
    retry: () => history.refetch(),
  }
}
