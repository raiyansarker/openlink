import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { stableContext } from '#/lib/react/stable-context'
import { useCallback, useContext, useMemo, type ReactNode } from 'react'

import { apiErrorMessage, apiFailure } from '#/lib/api/errors'
import { orpc } from '#/lib/api/orpc'
import type { OrganizationMembership, Workspace } from '#/lib/api/types'
import { AuthSession } from '#/lib/auth/client'
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
  organizations: Workspace[]
  status: DirectoryStatus
  /** User-facing message when `status` is `error`. */
  errorMessage: string | null
  refetch: () => void
  /**
   * Rejects with an Error carrying a user-facing message. A logo that fails to
   * upload does not undo the workspace; `logoError` explains what happened.
   */
  createOrganization: (input: CreateOrganizationInput) => Promise<{ organization: Workspace; logoError: string | null }>
  /** Refresh after changing a workspace (for example its logo). */
  invalidate: () => Promise<void>
}

const WorkspaceDirectoryContext = stableContext<WorkspaceDirectoryContextValue | null>('WorkspaceDirectory', null)

const NO_ORGANIZATIONS: Workspace[] = []

/** How often the workspace list is re-read while a tab is open. */
const DIRECTORY_REFRESH_MS = 60_000

/** Each membership becomes the workspace plus your role in it. Module-level so `select` stays stable. */
function toWorkspaces(data: { items: OrganizationMembership[] }): Workspace[] {
  return data.items.map((m) => ({ ...m.organization, role: m.role }))
}

export function WorkspaceDirectoryProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const workspacesKey = orpc.organizations.listOrganizations.queryKey()
  const query = useQuery(
    orpc.organizations.listOrganizations.queryOptions({
      select: toWorkspaces,
      // Someone else can remove you, rename a workspace or invite you to one: keep the list current.
      refetchInterval: DIRECTORY_REFRESH_MS,
      // Coming back to the tab always re-checks, even if the list was read seconds ago.
      refetchOnWindowFocus: 'always',
    }),
  )

  const create = useMutation(
    orpc.organizations.createOrganization.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: workspacesKey }),
    }),
  )

  const createOrganization = useCallback(
    async (input: CreateOrganizationInput) => {
      const name = input.name.trim()
      if (!name) throw new Error('Enter a workspace name.')
      if (!isValidOrganizationSlug(input.slug)) {
        throw new Error('Use a slug with lowercase letters, numbers, and hyphens (min. 2 characters).')
      }
      let organization: Workspace
      try {
        const created = await create.mutateAsync({ body: { name, slug: input.slug } })
        // The creator becomes the owner.
        organization = { ...created, role: 'owner' }
      } catch (error) {
        throw new Error(
          apiFailure(error).code === 'CONFLICT'
            ? 'That workspace URL is already taken. Pick another.'
            : apiErrorMessage(error, 'Could not create the workspace.'),
        )
      }
      // The first workspace completes onboarding; re-read the session so the guard sees it.
      AuthSession.invalidate()
      let logoError: string | null = null
      if (input.logo) {
        try {
          const logoUrl = await MediaUploads.setLogo(organization.id, await SquareImage.fromFile(input.logo))
          organization = { ...organization, logoUrl }
          await queryClient.invalidateQueries({ queryKey: workspacesKey })
        } catch (error) {
          logoError = error instanceof Error ? error.message : 'The logo could not be uploaded.'
        }
      }
      return { organization, logoError }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [create, queryClient],
  )

  const refetch = useCallback(() => void query.refetch(), [query])
  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: workspacesKey }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient],
  )

  const status: DirectoryStatus = query.isError ? 'error' : query.data ? 'ready' : 'loading'

  const value = useMemo<WorkspaceDirectoryContextValue>(
    () => ({
      organizations: query.data ?? NO_ORGANIZATIONS,
      status,
      errorMessage: query.isError ? apiErrorMessage(query.error, 'Could not load your workspaces.') : null,
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
