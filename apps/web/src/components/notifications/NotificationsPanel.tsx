import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Avatar } from '@astryxdesign/core/Avatar'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { List, ListItem } from '@astryxdesign/core/List'
import { Section } from '@astryxdesign/core/Section'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useAnswerInvite, useMyInvites } from '#/hooks/use-my-invites'
import { apiErrorMessage } from '#/lib/api/errors'
import type { MyInvite } from '#/lib/api/types'
import { formatShortDate } from '#/lib/format/short-date'
import { workspaceMemberRoleLabel } from '#/lib/members/role-label'

function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  if (hours < 48) return 'yesterday'
  return formatShortDate(iso)
}

/** "Grace invited you to join Other Co". */
function InviteSentence({ invite }: { invite: MyInvite }) {
  return (
    <Text maxLines={2}>
      {invite.invitedBy ? <Text weight="semibold">{invite.invitedBy.name}</Text> : 'You were'}
      {invite.invitedBy ? ' invited you to join ' : ' invited to join '}
      <Text weight="semibold">{invite.organization.name}</Text>
    </Text>
  )
}

function InviteRow({ invite, onJoined }: { invite: MyInvite; onJoined: (invite: MyInvite) => void }) {
  const { accept, decline } = useAnswerInvite()
  const [error, setError] = useState<string | null>(null)
  const isBusy = accept.isPending || decline.isPending
  const run = (action: () => Promise<unknown>) => {
    setError(null)
    action().catch((caught: unknown) => setError(apiErrorMessage(caught, 'Something went wrong.')))
  }

  return (
    <ListItem
      itemKey={invite.id}
      startContent={
        <Avatar
          src={invite.organization.logoUrl ?? invite.invitedBy?.imageUrl}
          name={invite.organization.name}
          size={32}
          tooltip={false}
        />
      }
      label={<InviteSentence invite={invite} />}
      description={
        error ??
        `As ${workspaceMemberRoleLabel(invite.role)} · ${timeAgo(invite.invitedAt)} · Expires ${formatShortDate(invite.expiresAt)}`
      }
      endContent={
        <HStack gap={2} vAlign="center">
          <Button
            variant="ghost"
            size="sm"
            label="Decline"
            isDisabled={isBusy}
            isLoading={decline.isPending}
            onClick={() => run(() => decline.mutateAsync({ params: { inviteId: invite.id } }))}
          />
          <Button
            variant="primary"
            size="sm"
            label="Join"
            isDisabled={isBusy}
            isLoading={accept.isPending}
            onClick={() => run(async () => {
              await accept.mutateAsync({ params: { inviteId: invite.id } })
              onJoined(invite)
            })}
          />
        </HStack>
      }
    />
  )
}

/** Your notifications. For now: invites to other workspaces, answered right here. */
export default function NotificationsPanel() {
  const navigate = useNavigate()
  const invites = useMyInvites()
  const [joined, setJoined] = useState<MyInvite | null>(null)
  const items = invites.data ?? []

  return (
    <Section paddingInline={8} paddingBlockStart={8} paddingBlockEnd={10}>
      <VStack gap={8} width="fill">
        <VStack gap={2}>
          <Heading level={1}>Notifications</Heading>
          <Text color="secondary">Things waiting on you, like an invite to join someone’s workspace.</Text>
        </VStack>

        {joined ? (
          <Banner
            status="success"
            title={`You joined ${joined.organization.name}`}
            endContent={
              <Button
                variant="secondary"
                size="sm"
                label="Open workspace"
                onClick={() => void navigate({ to: '/w/$orgSlug', params: { orgSlug: joined.organization.slug } })}
              />
            }
            onDismiss={() => setJoined(null)}
          />
        ) : null}

        {/* Each row says what it is ("Grace invited you to join Acme"), so no section heading. */}
        <VStack as="section" gap={3} width="fill" aria-label="Workspace invites">
          {invites.isPending ? (
            <VStack gap={4} hAlign="stretch" width="fill" aria-busy="true" aria-label="Loading invitations">
              {[0, 1].map((index) => (
                <HStack key={index} gap={3} vAlign="center" width="fill">
                  <Skeleton index={index * 2} width={32} height={32} radius="rounded" />
                  <VStack gap={2} hAlign="stretch" style={{ flex: 1 }}>
                    <Skeleton index={index * 2 + 1} width="50%" height={14} />
                    <Skeleton index={index * 2 + 1} width="30%" height={12} />
                  </VStack>
                </HStack>
              ))}
            </VStack>
          ) : invites.isError && items.length === 0 ? (
            <Banner
              status="error"
              title={apiErrorMessage(invites.error, 'Notifications could not be loaded.')}
              endContent={<Button variant="secondary" size="sm" label="Try again" onClick={() => void invites.refetch()} />}
            />
          ) : items.length === 0 ? (
            <EmptyState
              isCompact
              headingLevel={4}
              title="Nothing waiting on you"
              description="When someone invites you to their workspace, it shows up here so you can join or decline."
            />
          ) : (
            <List density="balanced">
              {items.map((invite) => (
                <InviteRow key={invite.id} invite={invite} onJoined={setJoined} />
              ))}
            </List>
          )}
        </VStack>
      </VStack>
    </Section>
  )
}
