import { Fragment } from 'react'
import { Divider } from '@astryxdesign/core/Divider'
import { Switch } from '@astryxdesign/core/Switch'
import { VStack } from '@astryxdesign/core/VStack'
import type { WebhookEvent } from '#/data/demo/webhooks'
import {
  WEBHOOK_EVENT_DESCRIPTIONS,
  WEBHOOK_EVENT_LABELS,
} from '#/data/demo/webhooks'

const ALL_EVENTS = Object.keys(WEBHOOK_EVENT_LABELS) as WebhookEvent[]

type WebhookEventSwitchesProps = {
  value: WebhookEvent[]
  onChange: (next: WebhookEvent[]) => void
}

/** One switch row per event; keeps at least one event on. */
export default function WebhookEventSwitches({
  value,
  onChange,
}: WebhookEventSwitchesProps) {
  const toggle = (event: WebhookEvent, isOn: boolean) => {
    const next = isOn
      ? ALL_EVENTS.filter((e) => e === event || value.includes(e))
      : value.filter((e) => e !== event)
    onChange(next)
  }

  return (
    <VStack gap={3} width="100%" hAlign="stretch">
      {ALL_EVENTS.map((event, index) => {
        const isOn = value.includes(event)
        const isLastOn = isOn && value.length === 1
        return (
          <Fragment key={event}>
            {index > 0 ? <Divider variant="subtle" /> : null}
            <Switch
              size="sm"
              label={WEBHOOK_EVENT_LABELS[event]}
              description={WEBHOOK_EVENT_DESCRIPTIONS[event]}
              value={isOn}
              onChange={(checked) => toggle(event, checked)}
              isDisabled={isLastOn}
              disabledMessage="Keep at least one event on."
              labelPosition="start"
              labelSpacing="spread"
              width="100%"
            />
          </Fragment>
        )
      })}
    </VStack>
  )
}
