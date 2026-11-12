import { VStack } from '@astryxdesign/core/VStack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { FormLayout } from '@astryxdesign/core/FormLayout'
import { TextInput } from '@astryxdesign/core/TextInput'
import { useOrganization } from '#/contexts/OrganizationContext'
import {
  getSettingsSectionMeta,
  type SettingsSection,
} from '#/lib/settings/sections'
import ProfileSettingsFields from '#/components/settings/ProfileSettingsFields'
import AppearanceSettingsFields from '#/components/settings/AppearanceSettingsFields'
import MembersSettingsFields from '#/components/settings/MembersSettingsFields'

type SettingsSectionPanelProps = {
  section: SettingsSection
}

export default function SettingsSectionPanel({ section }: SettingsSectionPanelProps) {
  const { activeOrg } = useOrganization()
  const meta = getSettingsSectionMeta(section)

  return (
    <VStack gap={5} hAlign="start" width="fill">
      {section === 'members' ? null : section === 'profile' || section === 'devices' ? (
        <Heading level={3} color="secondary">
          {meta.label}
        </Heading>
      ) : section === 'appearance' ? (
        <VStack gap={1} hAlign="start" width="fill">
          <Heading level={3} color="secondary">
            {meta.label}
          </Heading>
          <Text color="placeholder" type="supporting">
            {meta.description}
          </Text>
        </VStack>
      ) : (
        <VStack gap={1} hAlign="start" width="fill">
          <Heading level={3}>{meta.label}</Heading>
          <Text color="secondary" type="supporting">
            {meta.description}
          </Text>
        </VStack>
      )}

      {section === 'profile' && <ProfileSettingsFields />}
      {section === 'appearance' && <AppearanceSettingsFields />}
      {section === 'devices' && (
        <Text color="secondary">
          Active sessions and signed-in devices will be listed here.
        </Text>
      )}
      {section === 'general' && (
        <FormLayout direction="vertical">
          <TextInput
            label="Workspace name"
            width="100%"
            value={activeOrg.name}
            onChange={() => {}}
            description="Visible to everyone in this workspace."
          />
          <TextInput
            label="URL slug"
            width="100%"
            value={activeOrg.slug}
            isReadOnly
            description="Used in dashboard and short-link paths."
          />
        </FormLayout>
      )}
      {section === 'members' && <MembersSettingsFields />}
      {section === 'integrations' && (
        <Text color="secondary">
          Slack, webhooks, and third-party connections.
        </Text>
      )}
      {section === 'developers' && (
        <Text color="secondary">API keys, tokens, and request logs.</Text>
      )}
    </VStack>
  )
}
