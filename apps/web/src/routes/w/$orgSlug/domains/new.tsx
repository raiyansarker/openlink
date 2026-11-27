import { createFileRoute, Navigate } from '@tanstack/react-router'
import AddDomainForm from '#/components/domains/AddDomainForm'
import DomainFlowShell from '#/components/domains/DomainFlowShell'
import { usePermissions } from '#/hooks/use-permissions'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/w/$orgSlug/domains/new')({
  head: createPageHead('Add domain'),
  component: AddDomainPage,
})

function AddDomainPage() {
  const { orgSlug } = Route.useParams()
  return (
    <DomainFlowShell orgSlug={orgSlug}>
      <AddDomainGate orgSlug={orgSlug} />
    </DomainFlowShell>
  )
}

/** Only owners and admins add domains; deep links bounce back to the domain list. */
function AddDomainGate({ orgSlug }: { orgSlug: string }) {
  const { canManageDomains } = usePermissions()
  if (!canManageDomains) {
    return <Navigate to="/w/$orgSlug/domains" params={{ orgSlug }} />
  }
  return <AddDomainForm />
}
