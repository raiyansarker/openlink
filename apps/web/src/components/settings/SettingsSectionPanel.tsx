import { VStack } from '@astryxdesign/core/VStack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import {
  getSettingsSectionMeta,
  type SettingsSection,
} from '#/lib/settings/sections'
import ProfileSettingsFields from '#/components/settings/ProfileSettingsFields'
import AppearanceSettingsFields from '#/components/settings/AppearanceSettingsFields'
import DevicesSettingsFields from '#/components/settings/DevicesSettingsFields'
import ApiKeysSettingsFields from '#/components/settings/ApiKeysSettingsFields'
import IntegrationsSettingsFields from '#/components/settings/IntegrationsSettingsFields'
import MembersSettingsFields from '#/components/settings/MembersSettingsFields'
import GeneralSettingsFields from '#/components/settings/GeneralSettingsFields'

type SettingsSectionPanelProps = {
  section: SettingsSection
}

export default function SettingsSectionPanel({ section }: SettingsSectionPanelProps) {
  const meta = getSettingsSectionMeta(section)

  return (
    <VStack gap={5} hAlign="start" width="fill">
      {section === 'members' ||
      section === 'api-keys' ||
      section === 'integrations' ? null : section ===
        'appearance' ||
        section === 'devices' ? (
        <VStack gap={1} hAlign="start" width="fill">
          <Heading level={3}>{meta.label}</Heading>
          <Text color="secondary" type="supporting">
            {meta.description}
          </Text>
        </VStack>
      ) : section === 'profile' ? (
        <Heading level={3}>{meta.label}</Heading>
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
      {section === 'devices' && <DevicesSettingsFields />}
      {section === 'general' && <GeneralSettingsFields />}
      {section === 'members' && <MembersSettingsFields />}
      {section === 'integrations' && <IntegrationsSettingsFields />}
      {section === 'api-keys' && <ApiKeysSettingsFields />}
    </VStack>
  )
}
