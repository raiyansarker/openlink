import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { demoOrganizations } from '#/data/demo/organizations'
import {
  getLinksForOrg,
  getOrganizationBySlug,
  getStatsForOrg,
} from '#/data/demo/queries'
import type { Organization, OrgDashboardStats, ShortLink } from '#/data/demo/types'

export type CreateLinkInput = {
  destination: string
  slug: string
  title: string
}

type OrganizationContextValue = {
  organizations: Organization[]
  activeOrg: Organization
  activeOrgId: string
  links: ShortLink[]
  stats: OrgDashboardStats
  createLink: (input: CreateLinkInput) => Promise<ShortLink>
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

type OrganizationProviderProps = {
  orgSlugFromRoute: string
  children: ReactNode
}

function normalizeDestination(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function OrganizationProvider({
  orgSlugFromRoute,
  children,
}: OrganizationProviderProps) {
  const activeOrg =
    getOrganizationBySlug(orgSlugFromRoute) ?? demoOrganizations[0]

  const [extraLinks, setExtraLinks] = useState<ShortLink[]>([])

  const baseLinks = useMemo(
    () => getLinksForOrg(activeOrg.id),
    [activeOrg.id],
  )

  const links = useMemo(() => {
    const extras = extraLinks.filter((link) => link.orgId === activeOrg.id)
    return [...extras, ...baseLinks]
  }, [activeOrg.id, baseLinks, extraLinks])

  const stats = useMemo(() => {
    const base = getStatsForOrg(activeOrg.id)
    const extras = extraLinks.filter((link) => link.orgId === activeOrg.id)
    if (extras.length === 0) return base
    return {
      ...base,
      totalLinks: base.totalLinks + extras.length,
      activeLinks: base.activeLinks + extras.length,
    }
  }, [activeOrg.id, extraLinks])

  const createLink = useCallback(
    async (input: CreateLinkInput) => {
      const slug = input.slug.trim().toLowerCase()
      const destination = normalizeDestination(input.destination)
      if (!slug) throw new Error('Pick a short slug for the link.')
      if (!destination) throw new Error('Paste a destination URL to shorten.')

      const conflict = [...getLinksForOrg(activeOrg.id), ...extraLinks].some(
        (link) => link.orgId === activeOrg.id && link.slug === slug,
      )
      if (conflict) {
        throw new Error(`“${slug}” is already in use in this workspace.`)
      }

      try {
        // Validate URL shape early for demo UX
        new URL(destination)
      } catch {
        throw new Error('Enter a valid destination URL.')
      }

      const created: ShortLink = {
        id: `link_local_${Date.now()}`,
        orgId: activeOrg.id,
        slug,
        title: input.title.trim() || slug,
        targetUrl: destination,
        clicks: 0,
        uniqueClicks: 0,
        createdAt: new Date().toISOString(),
        status: 'active',
        tags: ['demo'],
      }

      setExtraLinks((prev) => [created, ...prev])
      return created
    },
    [activeOrg.id, extraLinks],
  )

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organizations: demoOrganizations,
      activeOrg,
      activeOrgId: activeOrg.id,
      links,
      stats,
      createLink,
    }),
    [activeOrg, links, stats, createLink],
  )

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
