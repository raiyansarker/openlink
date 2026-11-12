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

export type CreateOrganizationInput = {
  name: string
}

type OrganizationContextValue = {
  organizations: Organization[]
  activeOrg: Organization
  activeOrgId: string
  links: ShortLink[]
  stats: OrgDashboardStats
  createLink: (input: CreateLinkInput) => Promise<ShortLink>
  createOrganization: (input: CreateOrganizationInput) => Organization
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

function slugifyWorkspaceName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'workspace'
}

function uniqueOrgSlug(name: string, existing: Organization[]): string {
  const base = slugifyWorkspaceName(name)
  if (!existing.some((org) => org.slug === base)) return base
  let n = 2
  while (existing.some((org) => org.slug === `${base}-${n}`)) n += 1
  return `${base}-${n}`
}

export function OrganizationProvider({
  orgSlugFromRoute,
  children,
}: OrganizationProviderProps) {
  const [extraOrgs, setExtraOrgs] = useState<Organization[]>([])
  const organizations = useMemo(
    () => [...demoOrganizations, ...extraOrgs],
    [extraOrgs],
  )

  const activeOrg =
    organizations.find((org) => org.slug === orgSlugFromRoute) ??
    getOrganizationBySlug(orgSlugFromRoute) ??
    organizations[0]

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

  const createOrganization = useCallback(
    (input: CreateOrganizationInput) => {
      const name = input.name.trim()
      if (!name) {
        throw new Error('Enter a workspace name.')
      }
      const slug = uniqueOrgSlug(name, organizations)
      const created: Organization = {
        id: `org_${slug.replace(/-/g, '_')}`,
        name,
        slug,
        plan: 'free',
        memberCount: 1,
      }
      setExtraOrgs((prev) => [...prev, created])
      return created
    },
    [organizations],
  )

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organizations,
      activeOrg,
      activeOrgId: activeOrg.id,
      links,
      stats,
      createLink,
      createOrganization,
    }),
    [organizations, activeOrg, links, stats, createLink, createOrganization],
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
