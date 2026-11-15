import { use$ } from '@legendapp/state/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'

import type { Organization } from '#/data/demo/types'
import { ApiError } from '#/lib/api/error'
import { QueryKeys } from '#/lib/api/query'
import { WorkspaceApi } from '#/lib/api/workspaces'
import { isValidOrganizationSlug } from '#/lib/organization/slugify'
import { workspaceIcons$ } from '#/state/workspace-icons.state'

export type CreateOrganizationInput = {
  name: string
  slug: string
  /** Invite token that authorises creating a workspace. */
  inviteToken: string
  iconDataUrl?: string | null
}

export type DirectoryStatus = 'loading' | 'ready' | 'error'

type WorkspaceDirectoryContextValue = {
  organizations: Organization[]
  status: DirectoryStatus
  /** User-facing message when `status` is `error`. */
  errorMessage: string | null
  refetch: () => void
  /** Rejects with an Error carrying a user-facing message. */
  createOrganization: (input: CreateOrganizationInput) => Promise<Organization>
  orgCustomIcons: Record<string, string>
}

const WorkspaceDirectoryContext = createContext<WorkspaceDirectoryContextValue | null>(null)

const NO_ORGANIZATIONS: Organization[] = []

export function WorkspaceDirectoryProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: QueryKeys.organizations,
    queryFn: () => WorkspaceApi.shared.listOrganizations(),
  })
  const orgCustomIcons = use$(workspaceIcons$)

  const create = useMutation({
    mutationFn: (input: CreateOrganizationInput) => WorkspaceApi.shared.createOrganization(input),
    onSuccess: (created, input) => {
      queryClient.setQueryData<Organization[]>(QueryKeys.organizations, (prev) => [...(prev ?? []), created])
      if (input.iconDataUrl) workspaceIcons$[created.id].set(input.iconDataUrl)
    },
  })

  const createOrganization = useCallback(
    async (input: CreateOrganizationInput) => {
      const name = input.name.trim()
      if (!name) throw new Error('Enter a workspace name.')
      if (!isValidOrganizationSlug(input.slug)) {
        throw new Error('Use a slug with lowercase letters, numbers, and hyphens (min. 2 characters).')
      }
      if (!input.inviteToken.trim()) throw new Error('Enter your invite token.')
      try {
        return await create.mutateAsync({ ...input, name, inviteToken: input.inviteToken.trim() })
      } catch (error) {
        throw new Error(ApiError.message(error, 'Could not create the workspace.'))
      }
    },
    [create],
  )

  const refetch = useCallback(() => void query.refetch(), [query])

  const status: DirectoryStatus = query.isError ? 'error' : query.data ? 'ready' : 'loading'

  const value = useMemo<WorkspaceDirectoryContextValue>(
    () => ({
      organizations: query.data ?? NO_ORGANIZATIONS,
      status,
      errorMessage: query.isError ? ApiError.message(query.error, 'Could not load your workspaces.') : null,
      refetch,
      createOrganization,
      orgCustomIcons,
    }),
    [query.data, query.error, query.isError, status, refetch, createOrganization, orgCustomIcons],
  )

  return <WorkspaceDirectoryContext.Provider value={value}>{children}</WorkspaceDirectoryContext.Provider>
}

export function useWorkspaceDirectory(): WorkspaceDirectoryContextValue {
  const ctx = useContext(WorkspaceDirectoryContext)
  if (!ctx) {
    throw new Error('useWorkspaceDirectory must be used within WorkspaceDirectoryProvider')
  }
  return ctx
}
