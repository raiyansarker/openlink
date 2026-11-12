import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { demoOrganizations } from '#/data/demo/organizations'
import type { Organization } from '#/data/demo/types'
import {
  isValidOrganizationSlug,
  slugifyOrganizationSlug,
} from '#/lib/organization/slugify'

export type CreateOrganizationInput = {
  name: string
  slug?: string
  iconDataUrl?: string | null
}

type WorkspaceDirectoryContextValue = {
  organizations: Organization[]
  createOrganization: (input: CreateOrganizationInput) => Organization
  orgCustomIcons: Record<string, string>
}

const WorkspaceDirectoryContext =
  createContext<WorkspaceDirectoryContextValue | null>(null)

function uniqueOrgSlug(name: string, existing: Organization[]): string {
  const base = slugifyOrganizationSlug(name) || 'workspace'
  if (!existing.some((org) => org.slug === base)) return base
  let n = 2
  while (existing.some((org) => org.slug === `${base}-${n}`)) n += 1
  return `${base}-${n}`
}

export function WorkspaceDirectoryProvider({ children }: { children: ReactNode }) {
  const [extraOrgs, setExtraOrgs] = useState<Organization[]>([])
  const [orgCustomIcons, setOrgCustomIcons] = useState<Record<string, string>>({})

  const organizations = useMemo(
    () => [...demoOrganizations, ...extraOrgs],
    [extraOrgs],
  )

  const createOrganization = useCallback(
    (input: CreateOrganizationInput) => {
      const name = input.name.trim()
      if (!name) {
        throw new Error('Enter a workspace name.')
      }

      const slugCandidate = input.slug?.trim()
        ? slugifyOrganizationSlug(input.slug)
        : uniqueOrgSlug(name, organizations)

      if (!slugCandidate || !isValidOrganizationSlug(slugCandidate)) {
        throw new Error(
          'Use a slug with lowercase letters, numbers, and hyphens (min. 2 characters).',
        )
      }

      if (organizations.some((org) => org.slug === slugCandidate)) {
        throw new Error(`“${slugCandidate}” is already taken. Pick another slug.`)
      }

      const created: Organization = {
        id: `org_${slugCandidate.replace(/-/g, '_')}`,
        name,
        slug: slugCandidate,
        plan: 'free',
        memberCount: 1,
      }
      setExtraOrgs((prev) => [...prev, created])

      if (input.iconDataUrl) {
        const iconUrl = input.iconDataUrl
        setOrgCustomIcons((prev) => ({
          ...prev,
          [created.id]: iconUrl,
        }))
      }

      return created
    },
    [organizations],
  )

  const value = useMemo(
    () => ({
      organizations,
      createOrganization,
      orgCustomIcons,
    }),
    [organizations, createOrganization, orgCustomIcons],
  )

  return (
    <WorkspaceDirectoryContext.Provider value={value}>
      {children}
    </WorkspaceDirectoryContext.Provider>
  )
}

export function useWorkspaceDirectory(): WorkspaceDirectoryContextValue {
  const ctx = useContext(WorkspaceDirectoryContext)
  if (!ctx) {
    throw new Error(
      'useWorkspaceDirectory must be used within WorkspaceDirectoryProvider',
    )
  }
  return ctx
}
