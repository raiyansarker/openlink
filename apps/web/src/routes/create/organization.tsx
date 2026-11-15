import { createFileRoute } from '@tanstack/react-router'
import { AuthSession } from '#/lib/auth/client'
import { WorkspaceDirectoryProvider } from '#/contexts/WorkspaceDirectoryContext'
import { createPageHead } from '#/lib/page-title'
import CreateOrganizationShell from '#/components/create-organization/CreateOrganizationShell'
import CreateOrganizationForm from '#/components/create-organization/CreateOrganizationForm'

export const Route = createFileRoute('/create/organization')({
  beforeLoad: ({ location }) => AuthSession.requireSignedIn(location),
  head: createPageHead('Create organization'),
  component: CreateOrganizationPage,
})

function CreateOrganizationPage() {
  return (
    <WorkspaceDirectoryProvider>
      <CreateOrganizationShell>
        <CreateOrganizationForm />
      </CreateOrganizationShell>
    </WorkspaceDirectoryProvider>
  )
}
