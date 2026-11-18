import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { stableContext } from '#/lib/react/stable-context'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MAX_LINKS, useOrganization } from '#/contexts/OrganizationContext'
import { apiErrorMessage } from '#/lib/api/errors'
import { orpc } from '#/lib/api/orpc'
import type { Domain } from '#/lib/api/types'

type DomainsWorkspaceContextValue = {
  customDomains: Domain[]
  detailRequestDomainId: string | null
  /** Registers a hostname; rejects with a user-facing message. Opens its details once added. */
  addDomain: (hostname: string) => Promise<Domain>
  /** Re-checks DNS and certificate state on the server. */
  verifyDomain: (domainId: string) => Promise<void>
  /** Removes the domain and deletes every short link on it. */
  removeDomain: (domainId: string) => Promise<void>
  getDomainById: (domainId: string) => Domain | undefined
  consumeDetailRequest: () => string | null
}

const DomainsWorkspaceContext = stableContext<DomainsWorkspaceContextValue | null>('DomainsWorkspace', null)

/** Custom domains of the active workspace, from the API (shared with the create-link form). */
export function DomainsWorkspaceProvider({ children }: { children: ReactNode }) {
  const { activeOrg, domains, links } = useOrganization()
  const queryClient = useQueryClient()
  const orgId = activeOrg.id
  const [detailRequestDomainId, setDetailRequestDomainId] = useState<string | null>(null)

  useEffect(() => setDetailRequestDomainId(null), [orgId])

  // Counted from the loaded links so it follows edits at once; past the list's cap, trust the server's count.
  const customDomains = useMemo(
    () =>
      links.length >= MAX_LINKS
        ? domains
        : domains.map((d) => ({ ...d, linkCount: links.filter((l) => l.domainId === d.id).length })),
    [domains, links],
  )

  const input = { params: { organizationId: orgId } }
  const refreshDomains = () => queryClient.invalidateQueries({ queryKey: orpc.domains.listDomains.queryKey({ input }) })
  // Removing a domain deletes its links on the server, so the links list is refreshed too.
  const refreshDomainsAndLinks = () =>
    Promise.all([refreshDomains(), queryClient.invalidateQueries({ queryKey: orpc.links.listOrganizationLinks.key() })])

  const addMutation = useMutation(orpc.domains.addDomain.mutationOptions({ onSuccess: refreshDomains }))
  const refreshMutation = useMutation(orpc.domains.refreshDomainStatus.mutationOptions({ onSuccess: refreshDomains }))
  const removeMutation = useMutation(orpc.domains.removeDomain.mutationOptions({ onSuccess: refreshDomainsAndLinks }))

  const addDomain = useCallback(
    async (hostname: string) => {
      try {
        const domain = await addMutation.mutateAsync({ ...input, body: { hostname } })
        setDetailRequestDomainId(domain.id)
        return domain
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Could not add the domain.'))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgId],
  )

  const verifyDomain = useCallback(
    async (domainId: string) => {
      try {
        await refreshMutation.mutateAsync({ params: { organizationId: orgId, domainId } })
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Could not check the domain.'))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgId],
  )

  const removeDomain = useCallback(
    async (domainId: string) => {
      try {
        await removeMutation.mutateAsync({ params: { organizationId: orgId, domainId } })
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Could not remove the domain.'))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgId],
  )

  const consumeDetailRequest = useCallback(() => {
    const id = detailRequestDomainId
    if (id) setDetailRequestDomainId(null)
    return id
  }, [detailRequestDomainId])

  const getDomainById = useCallback(
    (domainId: string) => customDomains.find((d) => d.id === domainId),
    [customDomains],
  )

  const value = useMemo(
    () => ({
      customDomains,
      detailRequestDomainId,
      addDomain,
      verifyDomain,
      removeDomain,
      getDomainById,
      consumeDetailRequest,
    }),
    [customDomains, detailRequestDomainId, addDomain, verifyDomain, removeDomain, getDomainById, consumeDetailRequest],
  )

  return <DomainsWorkspaceContext.Provider value={value}>{children}</DomainsWorkspaceContext.Provider>
}

export function useDomainsWorkspace() {
  const ctx = useContext(DomainsWorkspaceContext)
  if (!ctx) {
    throw new Error('useDomainsWorkspace must be used within DomainsWorkspaceProvider')
  }
  return ctx
}
