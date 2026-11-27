import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { orpc } from '#/lib/api/orpc'

/**
 * Whether `url` can be shown in a frame, asked once typing pauses. `null`
 * while unknown. Cloaked links to sites that refuse are redirected instead.
 */
export function useFrameCheck(organizationId: string, url: string, enabled: boolean) {
  const [settled, setSettled] = useState(url)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(url), 600)
    return () => clearTimeout(timer)
  }, [url])

  // A read, even though the procedure is a POST: the answer is cached per URL.
  const query = useQuery(
    orpc.links.checkFraming.queryOptions({
      input: { params: { organizationId }, body: { url: settled } },
      enabled: enabled && settled === url && /^https?:\/\/\S+$/.test(settled),
      staleTime: 10 * 60_000,
      retry: false,
    }),
  )
  return { frameable: query.data?.frameable ?? null, isChecking: query.isFetching }
}
