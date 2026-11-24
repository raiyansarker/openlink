import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Avatar } from '@astryxdesign/core/Avatar'
import { Button } from '@astryxdesign/core/Button'
import { Divider } from '@astryxdesign/core/Divider'
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent } from '@astryxdesign/core/Layout'
import { Spinner } from '@astryxdesign/core/Spinner'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import ActivityDetailSheet from '#/components/activity/ActivityDetailSheet'
import { useOrganization } from '#/contexts/OrganizationContext'
import { usePermissions } from '#/hooks/use-permissions'
import { useMemberActivity } from '#/hooks/use-activity'
import { apiErrorMessage } from '#/lib/api/errors'
import type { ActivityEvent, Role } from '#/lib/api/types'
import type { Person } from '#/lib/members/people'
import { formatShortDate } from '#/lib/format/short-date'
import { workspaceMemberRoleLabel } from '#/lib/members/role-label'
import {
  FLOATING_END_DRAWER_PADDING,
  floatingEndDrawerStyle,
} from './floating-end-drawer'
import MemberActivityTimeline from './MemberActivityTimeline'
import MemberRowMenu from './MemberRowMenu'

type MemberDetailDrawerProps = {
  member: Person | null
  onOpenChange: (open: boolean) => void
  onChangeRole: (member: Person, role: Role) => void
  onRemove: (member: Person) => void
  onResendInvite: (member: Person) => void
}

/** How many of a member's latest actions the drawer shows; "See all" opens the rest. */
const ACTIVITY_LIMIT = 20

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
  member: current,
  onOpenChange,
  onChangeRole,
  onRemove,
  onResendInvite,
}: MemberDetailDrawerProps) {
  // Keep the last member (and their activity) on screen while the drawer animates closed.
  const [member, setMember] = useState(current)
  if (current && current !== member) setMember(current)
  const isOpen = current != null
  const { activeOrg } = useOrganization()
  const canManage = usePermissions().canManageMembers
  const userId = member?.kind === 'member' ? member.userId : null
  // What this person did most recently: their latest actions, filtered on the server.
  const activityQuery = useMemberActivity(activeOrg.id, userId, ACTIVITY_LIMIT)
  const activities = userId ? (activityQuery.data?.items ?? []) : []
  const [openEvent, setOpenEvent] = useState<ActivityEvent | null>(null)
  const navigate = useNavigate()

  const isOwner = member?.role === 'owner'
  const isPending = member?.kind === 'invite'

  const handleRemove = (person: Person) => {
    onRemove(person)
    onOpenChange(false)
  }

  return (
    <>
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      label={member?.name ?? 'Member'}
      side="end"
      width={420}
      purpose="info"
      padding={FLOATING_END_DRAWER_PADDING}
      style={floatingEndDrawerStyle({ isOpen })}
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
                      src={member.image}
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
                  {!isOwner && canManage ? (
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
                    label={isPending ? 'Invited' : 'Joined workspace'}
                    value={formatShortDate(member.since)}
                  />
                </VStack>

                <Divider variant="subtle" />

                <VStack gap={4} hAlign="stretch" width="100%">
                  <HStack hAlign="between" vAlign="center" gap={2} width="100%">
                    <Heading level={4} weight="bold">
                      Activity
                    </Heading>
                    {activities.length > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        label="See all"
                        tooltip={`All of ${member.name}'s activity`}
                        onClick={() =>
                          void navigate({
                            to: '/w/$orgSlug/activity',
                            params: { orgSlug: activeOrg.slug },
                            search: { q: member.name },
                          })
                        }
                      />
                    ) : null}
                  </HStack>
                  {isPending ? (
                    <Text type="supporting" color="secondary">
                      Activity shows up once they accept the invite.
                    </Text>
                  ) : activityQuery.isPending ? (
                    <Spinner size="md" label="Loading activity…" />
                  ) : activityQuery.isError ? (
                    <VStack gap={2} hAlign="start" role="alert">
                      <Text type="supporting">{apiErrorMessage(activityQuery.error, 'Could not load their activity.')}</Text>
                      <Button size="sm" variant="secondary" label="Try again" onClick={() => void activityQuery.refetch()} />
                    </VStack>
                  ) : (
                    <>
                      <MemberActivityTimeline events={activities} onOpenEvent={setOpenEvent} />
                      {activities.length >= ACTIVITY_LIMIT ? (
                        <Text type="supporting" color="secondary">
                          {`Showing the latest ${ACTIVITY_LIMIT}. See all for the rest.`}
                        </Text>
                      ) : null}
                    </>
                  )}
                </VStack>
              </VStack>
            </LayoutContent>
          }
        />
      ) : (
        <Layout content={<LayoutContent>{null}</LayoutContent>} />
      )}
    </Drawer>
    {/* An event's full details open over the member drawer. */}
    <ActivityDetailSheet event={openEvent} onOpenChange={(open) => !open && setOpenEvent(null)} />
    </>
  )
}
