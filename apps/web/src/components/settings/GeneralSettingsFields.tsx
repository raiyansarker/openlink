import { useMemo } from 'react'
import { VStack } from '@astryxdesign/core/VStack'
import WorkspaceDangerZone from '#/components/settings/WorkspaceDangerZone'
import WorkspaceDetailsFields, {
  useWorkspaceDetailsForm,
  type WorkspaceDetails,
} from '#/components/settings/WorkspaceDetailsForm'
import WorkspaceLogoBlock from '#/components/settings/WorkspaceLogoBlock'
import { useOrganization } from '#/contexts/OrganizationContext'

const FIELDS_MAX_WIDTH = 560

/** General workspace settings: logo, name and URL, and the danger zone. */
export default function GeneralSettingsFields() {
  const { activeOrg } = useOrganization()
  const canEdit = activeOrg.role === 'owner' || activeOrg.role === 'admin'

  const saved = useMemo<WorkspaceDetails>(
    () => ({
      name: activeOrg.name,
      slug: activeOrg.slug,
    }),
    [activeOrg.name, activeOrg.slug],
  )
  const form = useWorkspaceDetailsForm(saved)

  return (
    <VStack
      gap={8}
      hAlign="stretch"
      width="fill"
      style={{ width: '100%', maxWidth: FIELDS_MAX_WIDTH, alignSelf: 'stretch' }}
    >
      {/* The placeholder initials follow the name as it is typed. */}
      <form.Subscribe selector={(state) => state.values.name.trim() || saved.name}>
        {(name) => <WorkspaceLogoBlock name={name} />}
      </form.Subscribe>
      <WorkspaceDetailsFields form={form} saved={saved} canEdit={canEdit} />
      <WorkspaceDangerZone saved={saved} />
    </VStack>
  )
}
