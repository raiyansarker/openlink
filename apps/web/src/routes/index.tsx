import { createFileRoute } from '@tanstack/react-router'
import { AuthSession } from '#/lib/auth/client'
import WorkspaceRedirect from '#/components/workspace/WorkspaceRedirect'

/** Resolves the visitor's workspace from the API, then forwards to its URL. */
export const Route = createFileRoute('/')({
  beforeLoad: ({ location }) => AuthSession.requireSignedIn(location),
  component: () => <WorkspaceRedirect section="overview" />,
})
