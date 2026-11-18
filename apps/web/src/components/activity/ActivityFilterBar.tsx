import { useEffect, useRef, useState } from 'react'
import { InputGroup } from '@astryxdesign/core/InputGroup'
import { Selector } from '@astryxdesign/core/Selector'
import { TextInput } from '@astryxdesign/core/TextInput'
import { QUERY_DEBOUNCE_MS } from '#/hooks/use-activity'
import {
  ACTIVITY_CATEGORIES,
  type ActivityFilterState,
  type CategoryFilter,
} from '#/lib/activity/filters'
import { ACTIVITY_CATEGORY_LABELS } from '#/lib/activity/labels'

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All activity' },
  ...ACTIVITY_CATEGORIES.map((value) => ({ value, label: ACTIVITY_CATEGORY_LABELS[value] })),
]

type ActivityFilterBarProps = {
  filters: ActivityFilterState
  onFiltersChange: (change: Partial<ActivityFilterState>) => void
}

/** Search box and category picker. Typing stays instant; the URL and the server query follow once typing pauses. */
export default function ActivityFilterBar({ filters, onFiltersChange }: ActivityFilterBarProps) {
  const [draftQuery, setDraftQuery] = useState(filters.q)
  const queryTimer = useRef<number | undefined>(undefined)
  const changeQuery = (value: string) => {
    setDraftQuery(value)
    window.clearTimeout(queryTimer.current)
    queryTimer.current = window.setTimeout(() => {
      if (value !== filters.q) onFiltersChange({ q: value })
    }, QUERY_DEBOUNCE_MS)
  }
  useEffect(() => () => window.clearTimeout(queryTimer.current), [])

  return (
    <InputGroup label="Filter activity" size="sm">
      <TextInput
        label="Search activity"
        isLabelHidden
        size="sm"
        placeholder="Search by person, action, or item"
        value={draftQuery}
        onChange={changeQuery}
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
        value={filters.category}
        onChange={(value) => onFiltersChange({ category: value as CategoryFilter })}
      />
    </InputGroup>
  )
}
