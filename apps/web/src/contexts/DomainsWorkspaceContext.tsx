import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { stableContext } from '#/lib/react/stable-context'
import { useQueryClient } from '@tanstack/react-query'
import { useOrganization } from '#/contexts/OrganizationContext'
import type { WorkspaceCustomDomain } from '#/data/demo/domains'
import { DomainsApi } from '#/lib/api/domains'
import { QueryKeys } from '#/lib/api/query'

type DomainsWorkspaceContextValue = {
  customDomains: WorkspaceCustomDomain[]
  detailRequestDomainId: string | null
  /** Registers a hostname; rejects with a user-facing message. Opens its details once added. */
  addDomain: (hostname: string) => Promise<WorkspaceCustomDomain>
  /** Re-checks DNS and certificate state on the server. */
  verifyDomain: (domainId: string) => Promise<void>
  removeDomain: (domainId: string) => Promise<void>
  getDomainById: (domainId: string) => WorkspaceCustomDomain | undefined
  consumeDetailRequest: () => string | null
}

const DomainsWorkspaceContext = stableContext<DomainsWorkspaceContextValue | null>('DomainsWorkspace', null)

const domainsApi = new DomainsApi()

/** Custom domains of the active workspace, from the API (shared with the create-link form). */
export function DomainsWorkspaceProvider({ children }: { children: ReactNode }) {
  const { activeOrg, domains, links } = useOrganization()
  const queryClient = useQueryClient()
  const orgId = activeOrg.id
  const [detailRequestDomainId, setDetailRequestDomainId] = useState<string | null>(null)

  useEffect(() => setDetailRequestDomainId(null), [orgId])

  const customDomains = useMemo(
    () => domains.map((d) => ({ ...d, linkCount: links.filter((l) => l.domainId === d.id).length })),
    [domains, links],
  )

  const setDomains = useCallback(
    (update: (prev: WorkspaceCustomDomain[]) => WorkspaceCustomDomain[]) =>
      queryClient.setQueryData<WorkspaceCustomDomain[]>(QueryKeys.domains(orgId), (prev) => update(prev ?? [])),
    [queryClient, orgId],
  )

  const addDomain = useCallback(
    async (hostname: string) => {
      const domain = await domainsApi.add(orgId, hostname)
      setDomains((prev) => [domain, ...prev.filter((d) => d.id !== domain.id)])
      setDetailRequestDomainId(domain.id)
      return domain
    },
    [orgId, setDomains],
  )

  const verifyDomain = useCallback(
    async (domainId: string) => {
      const next = await domainsApi.refresh(orgId, domainId)
      setDomains((prev) => prev.map((d) => (d.id === domainId ? next : d)))
    },
    [orgId, setDomains],
  )

  const removeDomain = useCallback(
    async (domainId: string) => {
      await domainsApi.remove(orgId, domainId)
      setDomains((prev) => prev.filter((d) => d.id !== domainId))
    },
    [orgId, setDomains],
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
