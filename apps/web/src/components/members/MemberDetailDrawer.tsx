import { Avatar } from '@astryxdesign/core/Avatar'
import { Divider } from '@astryxdesign/core/Divider'
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent } from '@astryxdesign/core/Layout'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { getMemberActivities } from '#/data/demo/member-activities'
import type { WorkspaceMember, WorkspaceMemberRole } from '#/data/demo/types'
import { formatShortDate } from '#/lib/format/short-date'
import {
  demoLinksCreatedCount,
  demoSignInMethod,
} from '#/lib/members/member-detail-demo'
import { workspaceMemberRoleLabel } from '#/lib/members/role-label'
import {
  FLOATING_END_DRAWER_PADDING,
  floatingEndDrawerStyle,
} from './floating-end-drawer'
import MemberActivityTimeline from './MemberActivityTimeline'
import MemberRowMenu from './MemberRowMenu'

type MemberDetailDrawerProps = {
  member: WorkspaceMember | null
  onOpenChange: (open: boolean) => void
  onChangeRole: (memberId: string, role: WorkspaceMemberRole) => void
  onRemove: (memberId: string) => void
  onResendInvite: (memberId: string) => void
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack hAlign="between" vAlign="start" gap={4} width="100%">
      <Text type="supporting" color="secondary">
        {label}
      </Text>
      <Text type="supporting" maxLines={2} style={{ textAlign: 'end' }}>
        {value}
      </Text>
    </HStack>
  )
}

export default function MemberDetailDrawer({
  member,
  onOpenChange,
  onChangeRole,
  onRemove,
  onResendInvite,
}: MemberDetailDrawerProps) {
  const isOpen = member != null
  const activities = member ? getMemberActivities(member.id) : []

  const isOwner = member?.role === 'owner'
  const isPending = member?.status === 'pending'
  const lastActive = member?.lastActiveAt ?? member?.lastLoginAt

  const handleRemove = (memberId: string) => {
    onRemove(memberId)
    onOpenChange(false)
  }

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      label={member?.name ?? 'Member'}
      side="end"
      width={420}
      purpose="info"
      padding={FLOATING_END_DRAWER_PADDING}
      style={floatingEndDrawerStyle()}
    >
      {member ? (
        <Layout
          header={
            <DrawerHeader
              title="Member"
              onOpenChange={onOpenChange}
            />
          }
          content={
            <LayoutContent>
              <VStack gap={6} hAlign="stretch" width="100%">
                <HStack
                  hAlign="between"
                  vAlign="start"
                  gap={3}
                  width="100%"
                  wrap="nowrap"
                >
                  <HStack gap={3} vAlign="start">
                    <Avatar
                      src={member.avatarUrl}
                      name={member.name}
                      size={72}
                      tooltip={false}
                    />
                    <VStack gap={1} hAlign="start">
                      <Text weight="semibold">{member.name}</Text>
                      <Text type="supporting" color="secondary" maxLines={2}>
                        {member.email}
                      </Text>
                      <Text type="supporting" color="secondary">
                        {workspaceMemberRoleLabel(member.role)}
                        {isPending ? ' (Pending)' : ''}
                      </Text>
                    </VStack>
                  </HStack>
                  {!isOwner ? (
                    <MemberRowMenu
                      member={member}
                      onChangeRole={onChangeRole}
                      onResendInvite={onResendInvite}
                      onRemove={handleRemove}
                    />
                  ) : null}
                </HStack>

                {isOwner ? (
                  <Text type="supporting" color="secondary">
                    Owners manage workspace billing and cannot be removed here.
                  </Text>
                ) : null}

                <VStack gap={3} hAlign="stretch" width="100%">
                  <DetailRow
                    label="Last active"
                    value={
                      lastActive
                        ? formatDateTime(lastActive)
                        : isPending
                          ? '—'
                          : 'Not recorded'
                    }
                  />
                  <DetailRow
                    label="Joined workspace"
                    value={isPending ? '—' : formatShortDate(member.joinedAt)}
                  />
                  {!isPending ? (
                    <>
                      <DetailRow
                        label="Links created"
                        value={String(demoLinksCreatedCount(member.id))}
                      />
                      <DetailRow
                        label="Sign-in method"
                        value={demoSignInMethod(member)}
                      />
                    </>
                  ) : null}
                </VStack>

                <Divider variant="subtle" />

                <VStack gap={4} hAlign="stretch" width="100%">
                  <Heading level={4} weight="bold">
                    Activity
                  </Heading>
                  <MemberActivityTimeline events={activities} />
                </VStack>
              </VStack>
            </LayoutContent>
          }
        />
      ) : (
        <Layout content={<LayoutContent>{null}</LayoutContent>} />
      )}
    </Drawer>
  )
}
