import { Button } from '@astryxdesign/core/Button'
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import type { WorkspaceMemberRole } from '#/data/demo/types'
import {
  ASSIGNABLE_WORKSPACE_ROLES,
  WORKSPACE_MEMBER_ROLE_HELP,
} from '#/lib/members/role-help'
import { workspaceMemberRoleLabel } from '#/lib/members/role-label'
import {
  FLOATING_END_DRAWER_PADDING,
  floatingEndDrawerStyle,
} from './floating-end-drawer'

type InviteMemberDrawerProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  workspaceName: string
  email: string
  onEmailChange: (value: string) => void
  role: WorkspaceMemberRole
  onRoleChange: (role: WorkspaceMemberRole) => void
  error: string | null
  onSubmit: () => void
}

export default function InviteMemberDrawer({
  isOpen,
  onOpenChange,
  workspaceName,
  email,
  onEmailChange,
  role,
  onRoleChange,
  error,
  onSubmit,
}: InviteMemberDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      label="Invite people"
      side="end"
      width={400}
      purpose="form"
      padding={FLOATING_END_DRAWER_PADDING}
      style={floatingEndDrawerStyle()}
    >
      <Layout
        header={
          <DrawerHeader
            title="Invite people"
            subtitle={workspaceName}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={6} hAlign="stretch" width="100%">
              <VStack gap={1} hAlign="start" width="100%">
                <Text color="secondary" type="supporting">
                  Send a workspace invite by email. They pick a password on
                  first sign-in.
                </Text>
              </VStack>

              <TextInput
                label="Email"
                width="100%"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={onEmailChange}
                description={error ?? undefined}
                isRequired
                hasAutoFocus
              />

              <VStack gap={2} hAlign="stretch" width="100%">
                <Text weight="semibold">Workspace role</Text>
                <SegmentedControl
                  label="Workspace role"
                  value={role}
                  onChange={(value) =>
                    onRoleChange(value as WorkspaceMemberRole)
                  }
                  layout="fill"
                  size="sm"
                >
                  {ASSIGNABLE_WORKSPACE_ROLES.map((option) => (
                    <SegmentedControlItem
                      key={option}
                      value={option}
                      label={workspaceMemberRoleLabel(option)}
                    />
                  ))}
                </SegmentedControl>
                <Text type="supporting" color="secondary">
                  {WORKSPACE_MEMBER_ROLE_HELP[role]}
                </Text>
              </VStack>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end" width="100%" wrap="wrap">
              <Button
                variant="ghost"
                size="sm"
                label="Cancel"
                onClick={() => onOpenChange(false)}
              />
              <Button
                variant="primary"
                size="sm"
                label="Send invite"
                isDisabled={!email.trim()}
                onClick={onSubmit}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Drawer>
  )
}
