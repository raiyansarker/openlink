import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { isSettingsSection } from '#/lib/settings/sections'

export const Route = createFileRoute('/dashboard/$orgSlug/settings/$section')({
  beforeLoad: ({ params }) => {
    if (!isSettingsSection(params.section)) {
      throw notFound()
    }
    throw redirect({
      to: '/settings/$section',
      params: { section: params.section },
    })
  },
})
