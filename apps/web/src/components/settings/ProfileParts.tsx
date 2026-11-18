import type { ReactNode } from 'react'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import type { useCurrentUser } from '#/hooks/use-current-user'

/** The signed-in user, once loaded. */
export type CurrentUser = NonNullable<ReturnType<typeof useCurrentUser>['user']>

function MutedCaption({ children }: { children: ReactNode }) {
  return (
    <Text type="supporting" color="secondary">
      {children}
    </Text>
  )
}

export function PictureHelpCaption({ children }: { children: ReactNode }) {
  return (
    <Text
      type="supporting"
      color="secondary"
      style={{ fontSize: 11, lineHeight: 1.45, maxWidth: 280 }}
    >
      {children}
    </Text>
  )
}

/** A titled block of the Profile page. */
export function ProfileBlock({
  title,
  description,
  children,
}: {
  title: string
  description?: ReactNode
  children: ReactNode
}) {
  return (
    <VStack gap={2} hAlign="start" width="fill">
      <VStack gap={0.5} hAlign="start" width="fill">
        <Heading level={4} weight="bold">
          {title}
        </Heading>
        {description ? <MutedCaption>{description}</MutedCaption> : null}
      </VStack>
      {children}
    </VStack>
  )
}

/** A one-line result under a control: an error (announced at once) or a quiet note. */
export function Status({ message, tone }: { message: string; tone: 'error' | 'info' }) {
  return (
    <Text type="supporting" weight={tone === 'error' ? 'medium' : undefined} color={tone === 'info' ? 'secondary' : undefined} role={tone === 'error' ? 'alert' : 'status'}>
      {message}
    </Text>
  )
}
