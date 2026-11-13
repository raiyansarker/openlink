import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { InputGroup } from '@astryxdesign/core/InputGroup'
import { List, ListItem } from '@astryxdesign/core/List'
import { Selector } from '@astryxdesign/core/Selector'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import ActivityActorAvatar from '#/components/activity/ActivityActorAvatar'
import ActivityDetailSheet from '#/components/activity/ActivityDetailSheet'
import { useOrganization } from '#/contexts/OrganizationContext'
import {
  ACTIVITY_CATEGORY_LABELS,
  getWorkspaceActivity,
  type ActivityCategory,
  type WorkspaceActivityEvent,
} from '#/data/demo/workspace-activity'
import { formatEventTime, groupByDay } from '#/lib/activity/group-by-day'

type CategoryFilter = 'all' | ActivityCategory

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All activity' },
  ...(Object.keys(ACTIVITY_CATEGORY_LABELS) as ActivityCategory[]).map(
    (value) => ({ value, label: ACTIVITY_CATEGORY_LABELS[value] }),
  ),
]

function matchesSearch(event: WorkspaceActivityEvent, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [event.actor.name, event.action, event.target]
    .join(' ')
    .toLowerCase()
    .includes(q)
}

/** "Camille Laurent created link launch" with the people and things in bold. */
function ActivitySentence({ event }: { event: WorkspaceActivityEvent }) {
  return (
    <Text maxLines={1}>
      <Text weight="semibold">{event.actor.name}</Text> {event.action}{' '}
      <Text weight="semibold">{event.target}</Text>
    </Text>
  )
}

export default function DashboardActivityPanel() {
  const { activeOrg } = useOrganization()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Built after mount: demo times are relative to "now" and shown in the
  // viewer's timezone, so rendering them on the server would not hydrate.
  const [events, setEvents] = useState<WorkspaceActivityEvent[] | null>(null)

  useEffect(() => {
    setEvents(getWorkspaceActivity(activeOrg.id))
    setQuery('')
    setCategory('all')
    setSelectedId(null)
  }, [activeOrg.id])

  const filtered = useMemo(
    () =>
      (events ?? []).filter(
        (event) =>
          (category === 'all' || event.category === category) &&
          matchesSearch(event, query),
      ),
    [events, category, query],
  )
  const groups = useMemo(() => groupByDay(filtered), [filtered])
  const selected = events?.find((event) => event.id === selectedId) ?? null

  return (
    <VStack
      gap={8}
      hAlign="stretch"
      width="fill"
      paddingBlockStart={8}
      paddingInline={8}
      paddingBlockEnd={10}
    >
      <VStack gap={2} hAlign="start" width="fill">
        <Heading level={1}>Activity</Heading>
        <Text color="secondary" type="supporting">
          Everything that happened in {activeOrg.name}, newest first.
        </Text>
      </VStack>

      {events == null ? null : events.length === 0 ? (
        <EmptyState
          isCompact
          headingLevel={4}
          title="No activity yet"
          description="Changes to links, domains, members, and settings will show up here."
        />
      ) : (
        <VStack gap={6} hAlign="stretch" width="fill">
          <InputGroup label="Filter activity" size="sm">
            <TextInput
              label="Search activity"
              isLabelHidden
              size="sm"
              placeholder="Search by person, action, or item"
              value={query}
              onChange={setQuery}
              controlStyle={{ flex: '4 1 0', minWidth: 0, width: '80%' }}
            />
            <Selector
              label="Category"
              isLabelHidden
              variant="secondary"
              size="sm"
              width="20%"
              controlStyle={{ flex: '1 0 0', minWidth: 0, width: '100%' }}
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={(value) => setCategory(value as CategoryFilter)}
            />
          </InputGroup>

          {groups.length === 0 ? (
            <Text type="supporting" color="secondary">
              No activity matches your filters.
            </Text>
          ) : (
            <VStack gap={6} hAlign="stretch" width="fill">
              {groups.map((group) => (
                <VStack key={group.key} gap={2} hAlign="stretch" width="fill">
                  <Heading level={5} weight="bold" color="secondary">
                    {group.label}
                  </Heading>
                  <List className="activity-list activity-timeline" density="balanced">
                    {group.items.map((event) => (
                      <ListItem
                        key={event.id}
                        itemKey={event.id}
                        onClick={() => setSelectedId(event.id)}
                        startContent={<ActivityActorAvatar actor={event.actor} />}
                        label={<ActivitySentence event={event} />}
                        description={`${ACTIVITY_CATEGORY_LABELS[event.category]} · ${event.source}`}
                        endContent={
                          <HStack gap={2} vAlign="center">
                            <Text type="supporting" color="secondary">
                              {formatEventTime(event.occurredAt)}
                            </Text>
                            <Icon icon="chevronRight" size="sm" color="secondary" />
                          </HStack>
                        }
                      />
                    ))}
                  </List>
                </VStack>
              ))}
            </VStack>
          )}
        </VStack>
      )}

      <ActivityDetailSheet
        event={selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      />
    </VStack>
  )
}
