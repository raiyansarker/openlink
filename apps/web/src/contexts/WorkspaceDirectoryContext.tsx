import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { stableContext } from '#/lib/react/stable-context'
import { useCallback, useContext, useMemo, type ReactNode } from 'react'

import type { Organization } from '#/data/demo/types'
import { ApiError } from '#/lib/api/error'
import { AuthSession } from '#/lib/auth/client'
import { QueryKeys } from '#/lib/api/query'
import { WorkspaceApi } from '#/lib/api/workspaces'
import { isValidOrganizationSlug } from '#/lib/organization/slugify'
import { SquareImage } from '#/lib/media/square-image'
import { MediaUploads } from '#/lib/media/uploads'

export type CreateOrganizationInput = {
  name: string
  slug: string
  /** Uploaded to R2 after the workspace exists. */
  logo?: File | null
}

export type DirectoryStatus = 'loading' | 'ready' | 'error'

type WorkspaceDirectoryContextValue = {
  organizations: Organization[]
  status: DirectoryStatus
  /** User-facing message when `status` is `error`. */
  errorMessage: string | null
  refetch: () => void
  /**
   * Rejects with an Error carrying a user-facing message. A logo that fails to
   * upload does not undo the workspace; `logoError` explains what happened.
   */
  createOrganization: (input: CreateOrganizationInput) => Promise<{ organization: Organization; logoError: string | null }>
  /** Refresh after changing a workspace (for example its logo). */
  invalidate: () => Promise<void>
}

const WorkspaceDirectoryContext = stableContext<WorkspaceDirectoryContextValue | null>('WorkspaceDirectory', null)

const NO_ORGANIZATIONS: Organization[] = []

export function WorkspaceDirectoryProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: QueryKeys.organizations,
    queryFn: () => WorkspaceApi.shared.listOrganizations(),
  })

  const create = useMutation({
    mutationFn: (input: CreateOrganizationInput) => WorkspaceApi.shared.createOrganization(input),
    onSuccess: (created) => {
      queryClient.setQueryData<Organization[]>(QueryKeys.organizations, (prev) => [...(prev ?? []), created])
    },
  })

  const createOrganization = useCallback(
    async (input: CreateOrganizationInput) => {
      const name = input.name.trim()
      if (!name) throw new Error('Enter a workspace name.')
      if (!isValidOrganizationSlug(input.slug)) {
        throw new Error('Use a slug with lowercase letters, numbers, and hyphens (min. 2 characters).')
      }
      let organization: Organization
      try {
        organization = await create.mutateAsync({ ...input, name })
      } catch (error) {
        throw new Error(ApiError.message(error, 'Could not create the workspace.'))
      }
      // The first workspace completes onboarding; re-read the session so the guard sees it.
      AuthSession.invalidate()
      let logoError: string | null = null
      if (input.logo) {
        try {
          const logoUrl = await MediaUploads.setLogo(organization.id, await SquareImage.fromFile(input.logo))
          organization = { ...organization, logoUrl }
          queryClient.setQueryData<Organization[]>(QueryKeys.organizations, (prev) =>
            (prev ?? []).map((org) => (org.id === organization.id ? organization : org)),
          )
        } catch (error) {
          logoError = error instanceof Error ? error.message : 'The logo could not be uploaded.'
        }
      }
      return { organization, logoError }
    },
    [create, queryClient],
  )

  const refetch = useCallback(() => void query.refetch(), [query])
  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: QueryKeys.organizations }),
    [queryClient],
  )

  const status: DirectoryStatus = query.isError ? 'error' : query.data ? 'ready' : 'loading'

  const value = useMemo<WorkspaceDirectoryContextValue>(
    () => ({
      organizations: query.data ?? NO_ORGANIZATIONS,
      status,
      errorMessage: query.isError ? ApiError.message(query.error, 'Could not load your workspaces.') : null,
      refetch,
      createOrganization,
      invalidate,
    }),
    [query.data, query.error, query.isError, status, refetch, createOrganization, invalidate],
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
