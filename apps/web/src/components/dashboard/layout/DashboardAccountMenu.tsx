import { useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Avatar } from '@astryxdesign/core/Avatar'
import { BottomSheet } from '@astryxdesign/core/BottomSheet'
import { DropdownMenu, type DropdownMenuTriggerProps } from '@astryxdesign/core/DropdownMenu'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useCurrentUser } from '#/hooks/use-current-user'
import { useIsPhone } from '#/hooks/use-is-phone'
import { useOrganization } from '#/contexts/OrganizationContext'
import { AuthSession } from '#/lib/auth/client'
import {
  DASHBOARD_RAIL_BG,
  SHELL_CHROME_BORDER,
  SHELL_NAV_TEXT_PRIMARY,
  SHELL_NAV_TEXT_SECONDARY,
  SHELL_POPOVER_SURFACE,
} from './dashboard-shell-colors'
import { DayAndNightIcon, LogOutIcon, SettingsIcon, UserIcon } from '#/components/icons/IcnMcp'

/** iOS disclosure indicator for sheet rows that push another screen. */
function ChevronRightIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.35}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5.5 3.5 10 8l-4.5 4.5" />
    </svg>
  )
}

const PROFILE_SIZE = 38

type DashboardAccountMenuProps = {
  variant?: 'default' | 'rail'
}

const sheetRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  minHeight: 52,
  padding: '10px 12px',
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  textAlign: 'left',
  backgroundColor: 'transparent',
  color: SHELL_NAV_TEXT_PRIMARY,
}

/** One grouped row of the phone sheet: icon, label, optional detail, chevron. */
function SheetRow({
  icon,
  label,
  detail,
  onClick,
}: {
  icon: ReactNode
  label: string
  detail?: string
  onClick: () => void
}) {
  return (
    <button className="ol-focus-ring" type="button" onClick={onClick} style={sheetRowStyle}>
      <span style={{ display: 'flex', color: SHELL_NAV_TEXT_SECONDARY }}>{icon}</span>
      <VStack gap={0} hAlign="start" style={{ flex: 1, minWidth: 0 }}>
        <Text weight="medium">{label}</Text>
        {detail ? (
          <Text type="supporting" color="secondary" maxLines={1}>
            {detail}
          </Text>
        ) : null}
      </VStack>
      <span style={{ display: 'flex', color: SHELL_NAV_TEXT_SECONDARY }}>
        <ChevronRightIcon />
      </span>
    </button>
  )
}

/**
 * The avatar tab. On phones it opens a modal bottom sheet (account +
 * workspace settings + sign out) instead of the desktop dropdown — iOS keeps
 * account actions in a sheet, and the sheet is the only phone surface that
 * reaches workspace settings.
 */
export default function DashboardAccountMenu({
  variant = 'default',
}: DashboardAccountMenuProps) {
  const onRail = variant === 'rail'
  const navigate = useNavigate()
  const { user } = useCurrentUser()
  const { activeOrg } = useOrganization()
  const isPhone = useIsPhone()
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const accountName = user?.name?.trim() || user?.email || 'Account'

  const signOut = async () => {
    try {
      await AuthSession.signOut()
    } finally {
      // Even if the request failed, leave the dashboard: the guard re-checks the session.
      await navigate({ to: '/login', replace: true })
    }
  }

  const goToProfile = () => void navigate({ to: '/settings/profile' })
  const goToPreferences = () => void navigate({ to: '/settings/appearance' })
  const goToWorkspaceSettings = () =>
    void navigate({ to: '/settings/general' })

  // Partial: the phone branch passes only its own onClick into the same button.
  const avatarButton = (props: Partial<DropdownMenuTriggerProps>) => (
    <button
      className="ol-focus-ring"
      {...props}
      type="button"
      aria-label={
        isPhone
          ? `Account and settings for ${accountName}`
          : user
            ? `Account menu for ${accountName}`
            : 'Account menu'
      }
      style={{
        width: PROFILE_SIZE,
        height: PROFILE_SIZE,
        borderRadius: 10,
        border: onRail ? '2px solid rgba(255, 255, 255, 0.14)' : SHELL_CHROME_BORDER,
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
        style={
          onRail
            ? {
                '--color-text-primary': '#f4f4f5',
                '--color-neutral': 'rgba(255, 255, 255, 0.12)',
              } as CSSProperties
            : undefined
        }
      />
    </button>
  )

  // Phones: sheet, not dropdown. It also carries the workspace-settings entry,
  // which the mobile shell's tab bar has no room for.
  if (isPhone) {
    const close = () => setIsSheetOpen(false)
    const go = (to: () => void) => () => {
      close()
      to()
    }
    return (
      <>
        {avatarButton({ onClick: () => setIsSheetOpen(true) })}
        <BottomSheet
          isOpen={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          label="Account"
          purpose="info"
          height="capped"
        >
          <VStack gap={3} hAlign="stretch" width="100%">
            <HStack gap={3} vAlign="center">
              <Avatar
                src={user?.image || undefined}
                name={accountName}
                size={40}
                shape="rounded"
                tooltip={false}
              />
              <VStack gap={0} hAlign="start" style={{ minWidth: 0 }}>
                <Text weight="semibold" maxLines={1}>
                  {accountName}
                </Text>
                {user?.email ? (
                  <Text type="supporting" color="secondary" maxLines={1}>
                    {user.email}
                  </Text>
                ) : null}
              </VStack>
            </HStack>

            <VStack gap={1} hAlign="stretch" width="100%">
              <SheetRow icon={<UserIcon size={18} />} label="Profile" onClick={go(goToProfile)} />
              <SheetRow
                icon={<DayAndNightIcon size={18} />}
                label="Preferences"
                onClick={go(goToPreferences)}
              />
              <SheetRow
                icon={<SettingsIcon size={18} />}
                label="Workspace settings"
                detail={activeOrg.name}
                onClick={go(goToWorkspaceSettings)}
              />
            </VStack>

            <button
              className="ol-focus-ring"
              type="button"
              onClick={go(() => void signOut())}
              style={sheetRowStyle}
            >
              <span style={{ display: 'flex', color: 'var(--color-text-error)' }}>
                <LogOutIcon size={18} />
              </span>
              <Text weight="medium" style={{ color: 'var(--color-text-error)' }}>
                Sign out
              </Text>
            </button>
          </VStack>
        </BottomSheet>
      </>
    )
  }

  return (
    <DropdownMenu
      hasChevron={false}
      placement="end"
      alignment="center"
      menuWidth={220}
      renderTrigger={(triggerProps) => avatarButton(triggerProps)}
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
          onClick: goToPreferences,
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
