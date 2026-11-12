import { Avatar } from '@astryxdesign/core/Avatar'
import { Card } from '@astryxdesign/core/Card'
import { HStack } from '@astryxdesign/core/HStack'
import { CodeWindowIcon, SettingsIcon } from '#/components/icons/IcnMcp'
import type { ActivityActor } from '#/data/demo/workspace-activity'

type ActivityActorAvatarProps = {
  actor: ActivityActor
  size?: 32 | 40
}

/** People get an avatar; API keys and OpenLink itself get a muted icon tile. */
export default function ActivityActorAvatar({
  actor,
  size = 32,
}: ActivityActorAvatarProps) {
  if (actor.kind === 'member') {
    return (
      <Avatar src={actor.avatarUrl} name={actor.name} size={size} tooltip={false} />
    )
  }

  const icon =
    actor.kind === 'api-key' ? (
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
