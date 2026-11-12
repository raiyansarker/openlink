import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { DEMO_USER_AVATAR_URL } from './dashboard-shell-colors'

const PROFILE_SIZE = 38

export default function DashboardAccountMenu() {
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
            border: '2px solid rgba(255,255,255,0.14)',
            padding: 0,
            overflow: 'hidden',
            cursor: 'pointer',
            backgroundColor: '#141414',
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
          onClick: () => {},
        },
        {
          id: 'preferences',
          label: 'Preferences',
          onClick: () => {},
        },
        {
          id: 'billing',
          label: 'Billing',
          onClick: () => {},
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
