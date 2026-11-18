import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAnalyticsSummary } from '#/hooks/use-analytics'
import type { ShortLink, Workspace } from '#/lib/api/types'
import { orpc } from '#/lib/api/orpc'
import { LinkLiveStatus } from '#/lib/links/link-summary'
import { ShortUrl } from '#/lib/links/short-url'
import { listAllLinks, selectItems } from '#/contexts/organization/workspace-api'
import type { WorkspaceStats } from '#/contexts/OrganizationContext'

/** How often the links list (clicks, status) refreshes while the tab is visible. */
const LINKS_REFRESH_MS = 30_000

/**
 * What a workspace holds, read from the API: its links, folders and domains
 * (kept fresh), the helpers derived from them, and the cache refreshers the
 * write actions use after they save.
 */
export function useWorkspaceData(activeOrg: Workspace) {
  const queryClient = useQueryClient()
  const orgId = activeOrg.id
  const input = { params: { organizationId: orgId } }
  const linksKey = orpc.links.listOrganizationLinks.queryKey({ input: { ...input, query: {} } })
  const foldersKey = orpc.folders.listFolders.queryKey({ input })

  // Clicks land on the redirect path, outside this page, so the list refreshes
  // itself: on a timer while the tab is visible, and when you come back to it.
  const linksQuery = useQuery({
    queryKey: linksKey,
    queryFn: () => listAllLinks(orgId),
    refetchInterval: LINKS_REFRESH_MS,
    refetchOnWindowFocus: true,
  })
  const foldersQuery = useQuery(orpc.folders.listFolders.queryOptions({ input, select: selectItems }))
  // Domains never block the workspace; without them links fall back to the app host.
  const domainsQuery = useQuery(orpc.domains.listDomains.queryOptions({ input, select: selectItems }))

  const domains = useMemo(() => domainsQuery.data ?? [], [domainsQuery.data])
  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data])
  const links = useMemo(() => linksQuery.data ?? [], [linksQuery.data])

  // Writes refresh what they touched. Folder changes can move or delete links, so they refresh both.
  const refreshLinks = () => queryClient.invalidateQueries({ queryKey: linksKey })
  const refreshFolders = () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: foldersKey }), queryClient.invalidateQueries({ queryKey: linksKey })])
  /** Shows a saved link at once, then re-reads the list. */
  const putLink = (link: ShortLink) => {
    queryClient.setQueryData<ShortLink[]>(linksKey, (prev = []) =>
      prev.some((l) => l.id === link.id) ? prev.map((l) => (l.id === link.id ? link : l)) : [link, ...prev],
    )
    return refreshLinks()
  }

  const shortHostFor = useCallback((domainId: string | null | undefined) => ShortUrl.host(domainId, domains), [domains])
  const shortUrlFor = useCallback(
    (slug: string, domainId: string | null | undefined) => ShortUrl.build(slug, domainId, domains),
    [domains],
  )

  // Link counts come from the links; click numbers from recorded clicks.
  const summary = useAnalyticsSummary(orgId).data
  const stats = useMemo<WorkspaceStats>(
    () => ({
      totalLinks: links.length,
      activeLinks: links.filter((link) => LinkLiveStatus.current(link) === 'active' && !LinkLiveStatus.isExpired(link)).length,
      clicksToday: summary?.clicksToday ?? 0,
      clicksThisWeek: summary?.clicksThisWeek ?? 0,
      uniqueVisitorsWeek: summary?.uniqueVisitorsWeek ?? 0,
      topReferrer: summary?.topReferrer ?? '—',
    }),
    [links, summary],
  )

  const requireFolder = useCallback(
    (folderId: string | null, message = 'That folder no longer exists.') => {
      if (folderId && !folders.some((f) => f.id === folderId)) throw new Error(message)
    },
    [folders],
  )

  return {
    orgId,
    linksQuery,
    foldersQuery,
    domains,
    folders,
    links,
    stats,
    shortHostFor,
    shortUrlFor,
    requireFolder,
    putLink,
    refreshLinks,
    refreshFolders,
  }
}
