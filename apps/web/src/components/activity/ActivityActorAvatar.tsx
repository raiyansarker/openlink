import { Avatar } from '@astryxdesign/core/Avatar'
import { Card } from '@astryxdesign/core/Card'
import { HStack } from '@astryxdesign/core/HStack'
import { CodeWindowIcon, SettingsIcon } from '#/components/icons/IcnMcp'
import type { ActivityEvent } from '#/lib/api/types'

type ActivityActorAvatarProps = {
  actor: ActivityEvent['actor']
  size?: 32 | 40
}

/** People get an avatar; API keys and OpenLink itself get a muted icon tile. */
export default function ActivityActorAvatar({
  actor,
  size = 32,
}: ActivityActorAvatarProps) {
  if (actor.type === 'member') {
    return (
      <Avatar src={actor.imageUrl} name={actor.label} size={size} tooltip={false} />
    )
  }

  const icon =
    actor.type === 'api_key' ? (
      <CodeWindowIcon size={size / 2} strokeWidth={1.4} />
    ) : (
      <SettingsIcon size={size / 2} strokeWidth={1.4} />
    )

  return (
    <Card
      variant="muted"
      padding={0}
      width={size}
      height={size}
      aria-hidden
      style={{ borderRadius: '50%', flexShrink: 0 }}
    >
      <HStack
        hAlign="center"
        vAlign="center"
        width="100%"
        style={{ height: '100%', color: 'var(--color-text-secondary)' }}
      >
        {icon}
      </HStack>
    </Card>
  )
}
