import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  demoOrganizations,
  getLinksForOrg,
  getOrganization,
  getStatsForOrg,
} from '#/data/demo/fixtures'
import type { Organization, OrgDashboardStats, ShortLink } from '#/data/demo/types'

const STORAGE_KEY = 'openlink.active-org'

type OrganizationContextValue = {
  organizations: Organization[]
  activeOrg: Organization
  activeOrgId: string
  setActiveOrgId: (orgId: string) => void
  links: ShortLink[]
  stats: OrgDashboardStats
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

function readInitialOrgId(): string {
  if (typeof window === 'undefined') {
    return demoOrganizations[0].id
  }
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored && getOrganization(stored)) {
    return stored
  }
  return demoOrganizations[0].id
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [activeOrgId, setActiveOrgIdState] = useState(readInitialOrgId)

  const setActiveOrgId = useCallback((orgId: string) => {
    if (!getOrganization(orgId)) {
      return
    }
    setActiveOrgIdState(orgId)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, orgId)
    }
  }, [])

  const value = useMemo<OrganizationContextValue>(() => {
    const activeOrg = getOrganization(activeOrgId) ?? demoOrganizations[0]
    return {
      organizations: demoOrganizations,
      activeOrg,
      activeOrgId: activeOrg.id,
      setActiveOrgId,
      links: getLinksForOrg(activeOrg.id),
      stats: getStatsForOrg(activeOrg.id),
    }
  }, [activeOrgId, setActiveOrgId])

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
