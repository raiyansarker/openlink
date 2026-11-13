import { Text } from '@astryxdesign/core/Text'
import { deltaDirection, formatDelta } from '#/lib/analytics/format'

type DeltaTextProps = {
  current: number
  previous: number
  higherIsBetter?: boolean
}

/** "↑ 12.4%" in green, "↓ 3.1%" in red; "New" when there was nothing before. */
export default function DeltaText({ current, previous, higherIsBetter = true }: DeltaTextProps) {
  const delta = formatDelta(current, previous)
  if (delta == null) {
    return (
      <Text type="supporting" color="secondary">
        {current > 0 ? 'New' : '—'}
      </Text>
    )
  }
  const direction = deltaDirection(current, previous)
  const isGood = direction === 'flat' ? null : (direction === 'up') === higherIsBetter
  const color =
    isGood == null
      ? 'var(--color-text-secondary)'
      : isGood
        ? 'var(--color-data-categorical-green)'
        : 'var(--color-data-categorical-red)'
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  return (
    <Text type="supporting" weight="semibold" style={{ color, whiteSpace: 'nowrap' }}>
      {arrow} {delta.replace(/^[+−]/, '')}
    </Text>
  )
}
