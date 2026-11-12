import { MultiSelector } from '@astryxdesign/core/MultiSelector'
import type { MultiSelectorSection } from '@astryxdesign/core/MultiSelector'
import {
  WEBHOOK_EVENT_DEFINITIONS,
  WEBHOOK_EVENT_GROUP_LABELS,
  WEBHOOK_EVENTS,
  type WebhookEvent,
  type WebhookEventGroup,
} from '#/data/demo/webhooks'

const GROUP_ORDER = Object.keys(WEBHOOK_EVENT_GROUP_LABELS) as WebhookEventGroup[]

const EVENT_SECTIONS: MultiSelectorSection[] = GROUP_ORDER.map((group) => ({
  type: 'section',
  title: WEBHOOK_EVENT_GROUP_LABELS[group],
  options: WEBHOOK_EVENTS.filter(
    (event) => WEBHOOK_EVENT_DEFINITIONS[event].group === group,
  ).map((event) => ({
    value: event,
    label: WEBHOOK_EVENT_DEFINITIONS[event].label,
    description: event,
  })),
}))

type WebhookEventsSelectorProps = {
  value: WebhookEvent[]
  onChange: (next: WebhookEvent[]) => void
  description?: string
  isRequired?: boolean
}

/** Searchable, grouped multi-select for webhook event subscriptions. */
export default function WebhookEventsSelector({
  value,
  onChange,
  description,
  isRequired = false,
}: WebhookEventsSelectorProps) {
  return (
    <MultiSelector
      label="Events"
      description={description}
      options={EVENT_SECTIONS}
      value={value}
      onChange={(next) => onChange(next as WebhookEvent[])}
      placeholder="Choose events"
      triggerDisplay="badges"
      size="sm"
      maxBadges={2}
      hasSearch
      searchPlaceholder="Search events"
      hasSelectAll
      selectAllLabel="All events"
      isRequired={isRequired}
      status={
        value.length === 0
          ? { type: 'error', message: 'Pick at least one event.' }
          : undefined
      }
      width="100%"
    />
  )
}
