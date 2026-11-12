import { useNavigate } from '@tanstack/react-router'
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { buildSettingsPath } from '#/lib/settings/sections'
import {
  DASHBOARD_RAIL_BG,
  DEMO_USER_AVATAR_URL,
} from './dashboard-shell-colors'

const PROFILE_SIZE = 38

type DashboardAccountMenuProps = {
  variant?: 'default' | 'rail'
}

export default function DashboardAccountMenu({
  variant = 'default',
}: DashboardAccountMenuProps) {
  const onRail = variant === 'rail'
  const navigate = useNavigate()

  const goToProfile = () => {
    void navigate({ to: buildSettingsPath('profile') })
  }

  return (
    <DropdownMenu
      hasChevron={false}
      placement="end"
      alignment="center"
      menuWidth={220}
      renderTrigger={(triggerProps) => (
        <button
          {...triggerProps}
          type="button"
          aria-label="Account menu"
          style={{
            width: PROFILE_SIZE,
            height: PROFILE_SIZE,
            borderRadius: 10,
            border: onRail
              ? '2px solid rgba(255, 255, 255, 0.14)'
              : '1px solid rgba(0, 0, 0, 0.12)',
            padding: 0,
            overflow: 'hidden',
            cursor: 'pointer',
            backgroundColor: onRail ? DASHBOARD_RAIL_BG : '#ffffff',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 0,
          }}
        >
          <img
            src={DEMO_USER_AVATAR_URL}
            alt=""
            width={PROFILE_SIZE}
            height={PROFILE_SIZE}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
            }}
          />
        </button>
      )}
      items={[
        {
          id: 'profile',
          label: 'My Profile',
          onClick: goToProfile,
        },
        {
          id: 'preferences',
          label: 'Preferences',
          onClick: () =>
            void navigate({ to: buildSettingsPath('appearance') }),
        },
        { type: 'divider' },
        {
          id: 'sign-out',
          label: 'Sign out',
          variant: 'destructive',
          onClick: () => {},
        },
      ]}
    />
  )
}
