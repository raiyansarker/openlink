import { createFileRoute } from '@tanstack/react-router'
import AddDomainForm from '#/components/domains/AddDomainForm'
import DomainFlowShell from '#/components/domains/DomainFlowShell'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/dashboard/$orgSlug/domains/new')({
  head: createPageHead('Add domain'),
  component: AddDomainPage,
})

function AddDomainPage() {
  const { orgSlug } = Route.useParams()
  return (
    <DomainFlowShell orgSlug={orgSlug}>
      <AddDomainForm />
    </DomainFlowShell>
  )
}
