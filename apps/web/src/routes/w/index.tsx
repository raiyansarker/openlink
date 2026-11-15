import { createFileRoute } from '@tanstack/react-router'

import WorkspaceRedirect from '#/components/workspace/WorkspaceRedirect'

type WorkspaceEntrySearch = {
  /** Which part of the workspace to open once it is resolved. */
  section?: 'links' | 'analytics'
}

/** Resolves the visitor's workspace from the API, then forwards to its URL. */
export const Route = createFileRoute('/w/')({
  validateSearch: (search: Record<string, unknown>): WorkspaceEntrySearch => ({
    section: search.section === 'links' || search.section === 'analytics' ? search.section : undefined,
  }),
  component: WorkspaceEntry,
})

function WorkspaceEntry() {
  const { section } = Route.useSearch()
  return <WorkspaceRedirect section={section ?? 'overview'} />
}
