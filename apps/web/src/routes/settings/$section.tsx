import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import SettingsSectionPanel from '#/components/settings/SettingsSectionPanel'
import {
  getSettingsSectionMeta,
  isSettingsSection,
  type SettingsSection,
} from '#/lib/settings/sections'
import { formatPageTitle } from '#/lib/page-title'

export const Route = createFileRoute('/settings/$section')({
  beforeLoad: ({ params }) => {
    if (params.section === 'accounts') {
      throw redirect({
        to: '/settings/$section',
        params: { section: 'devices' },
        replace: true,
      })
    }
    if (!isSettingsSection(params.section)) {
      throw notFound()
    }
  },
  head: ({ params }) => {
    const { label } = getSettingsSectionMeta(params.section as SettingsSection)
    return {
      meta: [{ title: formatPageTitle(label, 'Settings') }],
    }
  },
  component: SettingsSectionPage,
})

function SettingsSectionPage() {
  const { section } = Route.useParams()
  return <SettingsSectionPanel section={section as SettingsSection} />
}
