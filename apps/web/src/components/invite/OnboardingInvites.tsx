import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Avatar } from '@astryxdesign/core/Avatar'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { List, ListItem } from '@astryxdesign/core/List'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { orpc } from '#/lib/api/orpc'
import { workspaceMemberRoleLabel } from '#/lib/members/role-label'

/**
 * On onboarding, before creating a workspace: invites already waiting for this address,
 * so someone who came to join a team is not pushed into making an empty workspace.
 * Each opens the invite's own page, where it is accepted or declined.
 */
export default function OnboardingInvites() {
  const navigate = useNavigate()
  const invites = useQuery(orpc.account.listMyInvites.queryOptions({ select: (data) => data.items }))
  const items = invites.data ?? []
  if (items.length === 0) return null

  return (
    <VStack gap={3} hAlign="stretch" width="100%">
      <Banner status="info" title="You have an invite waiting" description="Join an existing workspace, or create your own below." />
      <List density="balanced">
        {items.map((invite) => (
          <ListItem
            key={invite.id}
            itemKey={invite.id}
            startContent={<Avatar src={invite.organization.logoUrl} name={invite.organization.name} size={32} shape="rounded" tooltip={false} />}
            label={
              <Text maxLines={2}>
                {invite.invitedBy ? `${invite.invitedBy.name} invited you to join ` : 'You were invited to join '}
                <Text weight="semibold">{invite.organization.name}</Text>
              </Text>
            }
            description={`As ${workspaceMemberRoleLabel(invite.role)}`}
            endContent={
              <Button
                variant="primary"
                size="sm"
                label="View invite"
                onClick={() => void navigate({ to: '/invite/$inviteId', params: { inviteId: invite.id } })}
              />
            }
          />
        ))}
      </List>
    </VStack>
  )
}
