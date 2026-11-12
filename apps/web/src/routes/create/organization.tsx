import { createFileRoute } from '@tanstack/react-router'
import { OrganizationProvider } from '#/contexts/OrganizationContext'
import { getDefaultOrgSlug } from '#/lib/dashboard/org-slug'
import { createPageHead } from '#/lib/page-title'
import CreateOrganizationShell from '#/components/create-organization/CreateOrganizationShell'
import CreateOrganizationForm from '#/components/create-organization/CreateOrganizationForm'

export const Route = createFileRoute('/create/organization')({
  head: createPageHead('Create organization'),
  component: CreateOrganizationPage,
})

function CreateOrganizationPage() {
  return (
    <OrganizationProvider orgSlugFromRoute={getDefaultOrgSlug()}>
      <CreateOrganizationShell>
        <CreateOrganizationForm />
      </CreateOrganizationShell>
    </OrganizationProvider>
  )
}
