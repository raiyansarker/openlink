import { useNavigate } from '@tanstack/react-router'
import { Avatar } from '@astryxdesign/core/Avatar'
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { useCurrentUser } from '#/hooks/use-current-user'
import { AuthSession } from '#/lib/auth/client'
import {
  DASHBOARD_RAIL_BG,
  SHELL_CHROME_BORDER,
  SHELL_POPOVER_SURFACE,
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
  const { user } = useCurrentUser()
  const accountName = user?.name?.trim() || user?.email || 'Account'

  const signOut = async () => {
    try {
      await AuthSession.signOut()
    } finally {
      // Even if the request failed, leave the dashboard: the guard re-checks the session.
      await navigate({ to: '/login', replace: true })
    }
  }

  const goToProfile = () => {
    void navigate({ to: '/settings/profile' })
  }

  return (
    <DropdownMenu
      hasChevron={false}
      placement="end"
      alignment="center"
      menuWidth={220}
      renderTrigger={(triggerProps) => (
        <button
          className="ol-focus-ring"
          {...triggerProps}
          type="button"
          aria-label={user ? `Account menu for ${accountName}` : 'Account menu'}
          style={{
            width: PROFILE_SIZE,
            height: PROFILE_SIZE,
            borderRadius: 10,
            border: onRail
              ? '2px solid rgba(255, 255, 255, 0.14)'
              : SHELL_CHROME_BORDER,
            padding: 0,
            overflow: 'hidden',
            cursor: 'pointer',
            backgroundColor: onRail ? DASHBOARD_RAIL_BG : SHELL_POPOVER_SURFACE,
            // The rail is dark in both modes, so the Avatar's initials fallback uses its dark-mode colours there.
            ...(onRail ? { colorScheme: 'dark' } : {}),
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 0,
          }}
        >
          <Avatar
            src={user?.image || undefined}
            name={accountName}
            size={36}
            shape="rounded"
            tooltip={false}
          />
        </button>
      )}
      items={[
        // Your name and email open your profile; shown as a normal row, not a disabled one.
        {
          id: 'profile',
          label: user ? accountName : 'My Profile',
          ...(user ? { description: user.email } : {}),
          onClick: goToProfile,
        },
        {
          id: 'preferences',
          label: 'Preferences',
          onClick: () =>
            void navigate({ to: '/settings/appearance' }),
        },
        { type: 'divider' },
        {
          id: 'sign-out',
          label: 'Sign out',
          variant: 'destructive',
          onClick: () => void signOut(),
        },
      ]}
    />
  )
}
