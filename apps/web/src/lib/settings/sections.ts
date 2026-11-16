/** Settings pages listed in the settings nav. Each is its own file route under `routes/settings`. */
export type SettingsUserSection = 'profile' | 'appearance' | 'devices'
export type SettingsWorkspaceSection = 'general' | 'members' | 'integrations' | 'api-keys'
export type SettingsSection = SettingsUserSection | SettingsWorkspaceSection

type NavEntry<Id extends SettingsSection> = { id: Id; label: string; to: `/settings/${Id}` }

export const SETTINGS_USER_SECTIONS: NavEntry<SettingsUserSection>[] = [
  { id: 'profile', label: 'Profile', to: '/settings/profile' },
  { id: 'appearance', label: 'Appearance', to: '/settings/appearance' },
  { id: 'devices', label: 'Devices', to: '/settings/devices' },
]

export const SETTINGS_WORKSPACE_SECTIONS: NavEntry<SettingsWorkspaceSection>[] = [
  { id: 'general', label: 'General', to: '/settings/general' },
  { id: 'members', label: 'Members', to: '/settings/members' },
  { id: 'integrations', label: 'Webhooks', to: '/settings/integrations' },
  { id: 'api-keys', label: 'API keys', to: '/settings/api-keys' },
]
