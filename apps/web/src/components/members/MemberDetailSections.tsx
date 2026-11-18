import { useNavigate } from '@tanstack/react-router'
import { Avatar } from '@astryxdesign/core/Avatar'
import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Spinner } from '@astryxdesign/core/Spinner'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useOrganization } from '#/contexts/OrganizationContext'
import { useMemberActivity } from '#/hooks/use-activity'
import { apiErrorMessage } from '#/lib/api/errors'
import type { ActivityEvent, Role } from '#/lib/api/types'
import { formatShortDate } from '#/lib/format/short-date'
import type { Person } from '#/lib/members/people'
import { workspaceMemberRoleLabel } from '#/lib/members/role-label'
import MemberActivityTimeline from './MemberActivityTimeline'
import MemberRowMenu from './MemberRowMenu'

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

type MemberProfileProps = {
  member: Person
  onChangeRole: (member: Person, role: Role) => void
  onResendInvite: (member: Person) => void
  onRemove: (member: Person) => void
}

/** Who they are: picture, name, email and role, the row menu for managers, and when they joined. */
export function MemberProfile({ member, onChangeRole, onResendInvite, onRemove }: MemberProfileProps) {
  const { activeOrg } = useOrganization()
  const canManage = activeOrg.role === 'owner' || activeOrg.role === 'admin'
  const isOwner = member.role === 'owner'
  const isPending = member.kind === 'invite'

  return (
    <>
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
            onRemove={onRemove}
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
    </>
  )
}

/** What this person did most recently: their latest actions, filtered on the server. */
export function MemberActivitySection({
  member,
  onOpenEvent,
}: {
  member: Person
  onOpenEvent: (event: ActivityEvent) => void
}) {
  const { activeOrg } = useOrganization()
  const navigate = useNavigate()
  const isPending = member.kind === 'invite'
  const userId = member.kind === 'member' ? member.userId : null
  const activityQuery = useMemberActivity(activeOrg.id, userId, ACTIVITY_LIMIT)
  const activities = userId ? (activityQuery.data?.items ?? []) : []

  return (
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
          <MemberActivityTimeline events={activities} onOpenEvent={onOpenEvent} />
          {activities.length >= ACTIVITY_LIMIT ? (
            <Text type="supporting" color="secondary">
              {`Showing the latest ${ACTIVITY_LIMIT}. See all for the rest.`}
            </Text>
          ) : null}
        </>
      )}
    </VStack>
  )
}
