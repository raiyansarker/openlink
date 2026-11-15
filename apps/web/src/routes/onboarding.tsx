import { createFileRoute } from '@tanstack/react-router'

import CreateOrganizationForm from '#/components/create-organization/CreateOrganizationForm'
import CreateOrganizationShell from '#/components/create-organization/CreateOrganizationShell'
import { WorkspaceDirectoryProvider } from '#/contexts/WorkspaceDirectoryContext'
import { AuthSession } from '#/lib/auth/client'
import { createPageHead } from '#/lib/page-title'

/** First stop after sign-up: create a workspace. Every other page waits until this is done. */
export const Route = createFileRoute('/onboarding')({
  head: createPageHead('Welcome'),
  beforeLoad: ({ location }) => AuthSession.requireSignedIn(location),
  component: OnboardingPage,
})

function OnboardingPage() {
  return (
    <WorkspaceDirectoryProvider>
      <CreateOrganizationShell variant="onboarding">
        <CreateOrganizationForm variant="onboarding" />
      </CreateOrganizationShell>
    </WorkspaceDirectoryProvider>
  )
}
