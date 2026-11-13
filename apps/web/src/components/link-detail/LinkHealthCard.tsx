import { useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { PANEL_CARD_STYLE } from '#/components/create-link/LinkPreviewPanel'
import type { LinkHealth } from '#/data/demo/types'
import { HEALTH_LABEL, SLOW_RESPONSE_MS } from '#/lib/links/demo-health'
import { formatDateTime } from '#/lib/links/link-summary'

type LinkHealthCardProps = {
  health: LinkHealth | undefined
  onCheck: () => Promise<void>
  /** Drop the surrounding card, for use directly on a page section. */
  isFlat?: boolean
}

const HEALTH_HELP: Record<LinkHealth['status'], string> = {
  healthy: 'The destination loads normally.',
  redirects: 'The destination sends visitors somewhere else. Point the link at the final page to skip a hop.',
  slow: `The destination took over ${SLOW_RESPONSE_MS / 1000}s to respond. Visitors may give up before it loads.`,
  broken: 'The destination returned an error. Visitors land on a broken page — update the destination or put the link on hold.',
}

/** Small monochrome status mark: filled for healthy, ring otherwise. */
function HealthMark({ status }: { status: LinkHealth['status'] | 'unknown' }) {
  const filled = status === 'healthy'
  return (
    <span
      aria-hidden="true"
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        flexShrink: 0,
        background: filled ? 'var(--color-text-primary)' : 'transparent',
        border: `2px solid ${status === 'unknown' ? 'var(--color-border-emphasized)' : 'var(--color-text-primary)'}`,
      }}
    />
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <HStack gap={3} hAlign="between" width="100%" style={{ padding: '6px 0' }}>
      <Text type="supporting" color="secondary">
        {label}
      </Text>
      <Text type="supporting" weight="medium" maxLines={1} style={{ textAlign: 'end' }}>
        {value}
      </Text>
    </HStack>
  )
}

/**
 * Destination health from the backend's periodic check. "Check now" asks for
 * a fresh result (simulated in the demo).
 */
export default function LinkHealthCard({ health, onCheck, isFlat = false }: LinkHealthCardProps) {
  const [isChecking, setIsChecking] = useState(false)

  const check = async () => {
    setIsChecking(true)
    try {
      await onCheck()
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <VStack
      gap={4}
      hAlign="stretch"
      width="100%"
      style={isFlat ? undefined : { ...PANEL_CARD_STYLE, padding: 20 }}
    >
      <HStack gap={3} vAlign="center" width="100%">
        <HealthMark status={health?.status ?? 'unknown'} />
        <VStack gap={0} style={{ flex: 1, minWidth: 0 }}>
          <Text weight="semibold">
            {isChecking ? 'Checking…' : health ? HEALTH_LABEL[health.status] : 'Not checked yet'}
          </Text>
          <Text type="supporting" color="secondary">
            {health
              ? `Checked ${formatDateTime(health.checkedAt)}`
              : 'Destinations are checked every few hours.'}
          </Text>
        </VStack>
        <Button
          variant="secondary"
          size="sm"
          label="Check now"
          isLoading={isChecking}
          onClick={() => void check()}
        />
      </HStack>

      {health ? (
        <>
          <Text type="supporting" color="secondary">
            {HEALTH_HELP[health.status]}
          </Text>
          <VStack gap={0} hAlign="stretch" width="100%">
            <Row label="Response" value={`HTTP ${health.statusCode}`} />
            <Row label="Response time" value={`${health.responseMs.toLocaleString()} ms`} />
            {health.finalUrl ? (
              <Row label="Ends up at" value={health.finalUrl.replace(/^https?:\/\//, '')} />
            ) : null}
          </VStack>
        </>
      ) : null}
    </VStack>
  )
}
