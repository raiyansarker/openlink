import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useOrganization } from '#/contexts/OrganizationContext'
import type { WorkspaceCustomDomain } from '#/data/demo/domains'
import { getCustomDomainsForOrg } from '#/data/demo/queries'
import { demoVerifyDomain } from '#/lib/domains/demo-verify'

type DomainsWorkspaceContextValue = {
  customDomains: WorkspaceCustomDomain[]
  detailRequestDomainId: string | null
  addDomain: (domain: WorkspaceCustomDomain) => void
  replaceDomain: (domainId: string, next: WorkspaceCustomDomain) => void
  verifyDomain: (domainId: string) => void
  removeDomain: (domainId: string) => void
  getDomainById: (domainId: string) => WorkspaceCustomDomain | undefined
  consumeDetailRequest: () => string | null
}

const DomainsWorkspaceContext = createContext<DomainsWorkspaceContextValue | null>(
  null,
)

export function DomainsWorkspaceProvider({ children }: { children: ReactNode }) {
  const { activeOrg } = useOrganization()
  const [customDomains, setCustomDomains] = useState<WorkspaceCustomDomain[]>(
    () => getCustomDomainsForOrg(activeOrg.id),
  )
  const [detailRequestDomainId, setDetailRequestDomainId] = useState<
    string | null
  >(null)

  useEffect(() => {
    setCustomDomains(getCustomDomainsForOrg(activeOrg.id))
    setDetailRequestDomainId(null)
  }, [activeOrg.id])

  const addDomain = useCallback((domain: WorkspaceCustomDomain) => {
    setCustomDomains((prev) => [domain, ...prev])
    setDetailRequestDomainId(domain.id)
  }, [])

  const consumeDetailRequest = useCallback(() => {
    const id = detailRequestDomainId
    if (id) setDetailRequestDomainId(null)
    return id
  }, [detailRequestDomainId])

  const replaceDomain = useCallback(
    (domainId: string, next: WorkspaceCustomDomain) => {
      setCustomDomains((prev) =>
        prev.map((d) => (d.id === domainId ? next : d)),
      )
    },
    [],
  )

  const verifyDomain = useCallback((domainId: string) => {
    setCustomDomains((prev) => {
      const domain = prev.find((d) => d.id === domainId)
      if (!domain) return prev
      const next = demoVerifyDomain(domain)
      return prev.map((d) => (d.id === domainId ? next : d))
    })
  }, [])

  const removeDomain = useCallback((domainId: string) => {
    setCustomDomains((prev) => prev.filter((d) => d.id !== domainId))
  }, [])

  const getDomainById = useCallback(
    (domainId: string) => customDomains.find((d) => d.id === domainId),
    [customDomains],
  )

  const value = useMemo(
    () => ({
      customDomains,
      detailRequestDomainId,
      addDomain,
      replaceDomain,
      verifyDomain,
      removeDomain,
      getDomainById,
      consumeDetailRequest,
    }),
    [
      customDomains,
      detailRequestDomainId,
      addDomain,
      replaceDomain,
      verifyDomain,
      removeDomain,
      getDomainById,
      consumeDetailRequest,
    ],
  )

  return (
    <DomainsWorkspaceContext.Provider value={value}>
      {children}
    </DomainsWorkspaceContext.Provider>
  )
}

export function useDomainsWorkspace() {
  const ctx = useContext(DomainsWorkspaceContext)
  if (!ctx) {
    throw new Error('useDomainsWorkspace must be used within DomainsWorkspaceProvider')
  }
  return ctx
}
