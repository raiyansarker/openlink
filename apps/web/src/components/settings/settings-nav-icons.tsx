import type { ReactNode } from 'react'
import type { SettingsSection } from '#/lib/settings/sections'
import {
  UserIcon,
  TimelineViewIcon,
  LaptopIcon,
  BuildingIcon,
  UsersIcon,
  AppIntegrationIcon,
  CodeWindowIcon,
} from '#/components/icons/IcnMcp'

const ICON_SIZE = 16
const ICON_STROKE = 1.2

const navIconProps = { size: ICON_SIZE, strokeWidth: ICON_STROKE } as const

export const SETTINGS_SECTION_ICONS: Record<SettingsSection, ReactNode> = {
  profile: <UserIcon {...navIconProps} />,
  appearance: <TimelineViewIcon {...navIconProps} />,
  devices: <LaptopIcon {...navIconProps} />,
  general: <BuildingIcon {...navIconProps} />,
  members: <UsersIcon {...navIconProps} />,
  integrations: <AppIntegrationIcon {...navIconProps} />,
  developers: <CodeWindowIcon {...navIconProps} />,
}
