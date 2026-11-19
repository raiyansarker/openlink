import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { stableContext } from '#/lib/react/stable-context'
import { useCallback, useContext, useMemo, type ReactNode } from 'react'

import { apiErrorMessage, apiFailure } from '#/lib/api/errors'
import { orpc } from '#/lib/api/orpc'
import type { OrganizationMembership, Workspace } from '#/lib/api/types'
import { AuthSession } from '#/lib/auth/client'
import { isValidOrganizationSlug } from '#/lib/organization/slugify'
import { SquareImage } from '#/lib/media/square-image'

export type CreateOrganizationInput = {
  name: string
  /** The workspace URL. Left out, the server generates a unique one from the name. */
  slug?: string
  /** Sent in the same request; if the server refuses it, no workspace is created. */
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
   * Creates the workspace and its logo in one request. Rejects with an Error carrying a
   * user-facing message; when it rejects, nothing was created.
   */
  createOrganization: (input: CreateOrganizationInput) => Promise<{ organization: Workspace }>
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
      if (input.slug !== undefined && !isValidOrganizationSlug(input.slug)) {
        throw new Error('Use a slug with lowercase letters, numbers, and hyphens (min. 2 characters).')
      }
      // Cropped and shrunk in the browser first; a picture that can't be used stops here.
      const logo = input.logo ? await SquareImage.fromFile(input.logo) : undefined
      let organization: Workspace
      try {
        const created = await create.mutateAsync({ body: { name, ...(input.slug ? { slug: input.slug } : {}), ...(logo ? { logo } : {}) } })
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
      return { organization }
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
