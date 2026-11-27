import { createFileRoute } from '@tanstack/react-router'

import CreateOrganizationForm from '#/components/create-organization/CreateOrganizationForm'
import CreateOrganizationShell from '#/components/create-organization/CreateOrganizationShell'
import OnboardingInvites from '#/components/invite/OnboardingInvites'
import { WorkspaceDirectoryProvider } from '#/contexts/WorkspaceDirectoryContext'
import { AuthSession } from '#/lib/auth/client'
import { defaultWorkspaceName } from '#/lib/organization/default-workspace'
import { createPageHead } from '#/lib/page-title'

/**
 * First stop after sign-up: create a workspace (named after the person, with a URL the
 * server picks), or join one they were invited to. Every other page waits until this is done.
 */
export const Route = createFileRoute('/onboarding')({
  beforeLoad: ({ location }) => AuthSession.requireSignedIn(location),
  head: createPageHead('Welcome'),
  component: OnboardingPage,
})

function OnboardingPage() {
  const { user } = Route.useRouteContext()
  return (
    <WorkspaceDirectoryProvider>
      <CreateOrganizationShell variant="onboarding">
        <OnboardingInvites />
        <CreateOrganizationForm variant="onboarding" defaultName={defaultWorkspaceName(user?.name)} />
      </CreateOrganizationShell>
    </WorkspaceDirectoryProvider>
  )
}
