import { createFileRoute, redirect } from '@tanstack/react-router'

/** Settings used to live under each workspace; send old links to `/settings/…`. */
export const Route = createFileRoute('/w/$orgSlug/settings/$')({
  beforeLoad: ({ params }) => {
    throw redirect({ href: `/settings/${params._splat ?? ''}`, replace: true })
  },
})
