import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { demoOrganizations } from '#/data/demo/organizations'
import {
  getLinksForOrg,
  getOrganizationById,
  getStatsForOrg,
} from '#/data/demo/queries'
import type { Organization, OrgDashboardStats, ShortLink } from '#/data/demo/types'

type OrganizationContextValue = {
  organizations: Organization[]
  activeOrg: Organization
  activeOrgId: string
  links: ShortLink[]
  stats: OrgDashboardStats
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

type OrganizationProviderProps = {
  /** Active organization id from the `/dashboard/:orgId` URL segment. */
  orgIdFromRoute: string
  children: ReactNode
}

export function OrganizationProvider({
  orgIdFromRoute,
  children,
}: OrganizationProviderProps) {
  const value = useMemo<OrganizationContextValue>(() => {
    const activeOrg =
      getOrganizationById(orgIdFromRoute) ?? demoOrganizations[0]
    return {
      organizations: demoOrganizations,
      activeOrg,
      activeOrgId: activeOrg.id,
      links: getLinksForOrg(activeOrg.id),
      stats: getStatsForOrg(activeOrg.id),
    }
  }, [orgIdFromRoute])

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization(): OrganizationContextValue {
  const ctx = useContext(OrganizationContext)
  if (!ctx) {
    throw new Error('useOrganization must be used within OrganizationProvider')
  }
  return ctx
}
