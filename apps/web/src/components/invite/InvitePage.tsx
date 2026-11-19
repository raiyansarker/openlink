import { useState } from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Avatar } from '@astryxdesign/core/Avatar'
import { Button } from '@astryxdesign/core/Button'
import { Center } from '@astryxdesign/core/Center'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import AuthShell from '#/components/auth/AuthShell'
import { isPlainClick } from '#/components/auth/auth-links'
import { useNotify } from '#/hooks/use-notify'
import { apiFailure } from '#/lib/api/errors'
import { api, orpc } from '#/lib/api/orpc'
import type { MyInvite } from '#/lib/api/types'
import { AuthSession } from '#/lib/auth/client'
import { ActiveWorkspace } from '#/lib/dashboard/org-slug'
import { formatShortDate } from '#/lib/format/short-date'
import { workspaceMemberRoleLabel } from '#/lib/members/role-label'

/**
 * Signed out: the same page for every invite id, so it never says whether one exists.
 * Both buttons come back here once the person is signed in (and verified).
 */
export function SignedOutInvite({ inviteId }: { inviteId: string }) {
  const navigate = useNavigate()
  const back = `/invite/${inviteId}`
  const go = (to: '/login' | '/signup') => (event: React.MouseEvent) => {
    if (!isPlainClick(event)) return
    event.preventDefault()
    void navigate({ to, search: { redirect: back } })
  }
  const href = (to: string) => `${to}?redirect=${encodeURIComponent(back)}`
  return (
    <AuthShell heading="Sign in to view this invite" subheading="Invites open for the email address they were sent to.">
      <VStack gap={2} hAlign="stretch">
        <Button variant="primary" label="Sign in" width="100%" href={href('/login')} onClick={go('/login')} />
        <Button variant="ghost" label="Create an account" width="100%" href={href('/signup')} onClick={go('/signup')} />
      </VStack>
    </AuthShell>
  )
}

export function RateLimitedInvite() {
  return (
    <AuthShell heading="Too many requests" subheading="Wait a minute, then reload this page.">
      {null}
    </AuthShell>
  )
}

/** For the signed-in address the invite was sent to: join, or turn it down. */
export function PendingInvite({ invite }: { invite: MyInvite }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [pending, setPending] = useState<'accept' | 'decline' | null>(null)

  /** Gone since the page loaded (revoked, expired, answered elsewhere): reload, which shows the 404. */
  const handleError = async (error: unknown) => {
    const failure = apiFailure(error)
    if (failure.status === 404) return void (await router.invalidate())
    notify.error(failure.message)
  }

  const answer = async (choice: 'accept' | 'decline') => {
    setPending(choice)
    try {
      if (choice === 'accept') {
        await api.account.acceptMyInvite({ params: { inviteId: invite.id } })
        // Joining completes onboarding, and /w opens the workspace just joined.
        ActiveWorkspace.remember(invite.organization.slug)
        AuthSession.invalidate()
        await queryClient.invalidateQueries({ queryKey: orpc.organizations.listOrganizations.queryKey() })
      } else {
        await api.account.declineMyInvite({ params: { inviteId: invite.id } })
        notify.info(`You declined the invite to ${invite.organization.name}.`)
      }
      await router.navigate({ to: '/w', replace: true })
    } catch (error) {
      await handleError(error)
    } finally {
      setPending(null)
    }
  }

  const inviter = invite.invitedBy?.name
  return (
    <AuthShell
      heading={`Join ${invite.organization.name}`}
      subheading={`${inviter ? `${inviter} invited you` : 'You were invited'} to join as ${workspaceMemberRoleLabel(invite.role)}.`}
      illustration={
        <Center>
          <Avatar src={invite.organization.logoUrl} name={invite.organization.name} size={64} tooltip={false} />
        </Center>
      }
    >
      <VStack gap={5} hAlign="stretch">
        <Text color="secondary" size="sm" justify="center">
          This invite expires on {formatShortDate(invite.expiresAt)}.
        </Text>
        <VStack gap={2} hAlign="stretch">
          <Button
            variant="primary"
            width="100%"
            label="Accept invite"
            isLoading={pending === 'accept'}
            isDisabled={pending !== null}
            onClick={() => void answer('accept')}
          />
          <Button
            variant="ghost"
            width="100%"
            label="Decline"
            isLoading={pending === 'decline'}
            isDisabled={pending !== null}
            onClick={() => void answer('decline')}
          />
        </VStack>
      </VStack>
    </AuthShell>
  )
}
