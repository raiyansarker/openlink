import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/$orgId/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dashboard/$orgId/settings"!</div>
}
