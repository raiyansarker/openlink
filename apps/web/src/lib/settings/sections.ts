export type SettingsUserSection = 'profile' | 'appearance' | 'devices'
export type SettingsWorkspaceSection =
  | 'general'
  | 'members'
  | 'integrations'
  | 'api-keys'

export type SettingsSection = SettingsUserSection | SettingsWorkspaceSection

export const SETTINGS_USER_SECTIONS: {
  id: SettingsUserSection
  label: string
  description: string
}[] = [
  {
    id: 'profile',
    label: 'Profile',
    description: 'Picture, name, email, password, and account deletion',
  },
  {
    id: 'appearance',
    label: 'Appearance',
    description: 'Choose how Openlink looks on this device.',
  },
  {
    id: 'devices',
    label: 'Devices',
    description: 'Browsers and devices where you are signed in',
  },
]

export const SETTINGS_WORKSPACE_SECTIONS: {
  id: SettingsWorkspaceSection
  label: string
  description: string
}[] = [
  { id: 'general', label: 'General', description: 'Name, URL, region, and workspace controls' },
  { id: 'members', label: 'Members', description: 'People and roles' },
  {
    id: 'integrations',
    label: 'Webhooks',
    description: 'HTTPS endpoints for signed workspace events.',
  },
  {
    id: 'api-keys',
    label: 'API keys',
    description: 'Create and manage keys for scripts and integrations.',
  },
]

const ALL_SECTIONS = new Set<string>([
  ...SETTINGS_USER_SECTIONS.map((s) => s.id),
  ...SETTINGS_WORKSPACE_SECTIONS.map((s) => s.id),
])

export function isSettingsSection(id: string): id is SettingsSection {
  return ALL_SECTIONS.has(id)
}

export function getSettingsSectionMeta(id: SettingsSection) {
  return (
    [...SETTINGS_USER_SECTIONS, ...SETTINGS_WORKSPACE_SECTIONS].find(
      (s) => s.id === id,
    ) ?? SETTINGS_USER_SECTIONS[0]
  )
}

export function buildSettingsPath(section: SettingsSection = 'profile'): string {
  return `/settings/${section}`
}
