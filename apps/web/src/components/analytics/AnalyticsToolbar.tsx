import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl'
import { Selector } from '@astryxdesign/core/Selector'
import { Switch } from '@astryxdesign/core/Switch'
import { Toolbar } from '@astryxdesign/core/Toolbar'
import {
  RANGE_OPTIONS,
  type AnalyticsRange,
  type TrackedLink,
} from '#/lib/analytics/demo-dataset'

export const ALL_LINKS = '__all__'

type AnalyticsToolbarProps = {
  range: AnalyticsRange
  onRangeChange: (range: AnalyticsRange) => void
  linkId: string
  onLinkChange: (linkId: string) => void
  links: TrackedLink[]
  isComparing: boolean
  onCompareChange: (value: boolean) => void
}

/** Global filters: every panel below re-reads from these. */
export default function AnalyticsToolbar({
  range,
  onRangeChange,
  linkId,
  onLinkChange,
  links,
  isComparing,
  onCompareChange,
}: AnalyticsToolbarProps) {
  const linkOptions = [
    { value: ALL_LINKS, label: 'All links' },
    { type: 'divider' as const },
    ...links.map((link) => ({ value: link.id, label: link.slug, description: link.title })),
  ]

  return (
    <Toolbar
      label="Analytics filters"
      size="sm"
      gap={3}
      startContent={
        <>
          <SegmentedControl
            label="Time range"
            value={range}
            onChange={(value) => onRangeChange(value as AnalyticsRange)}
            size="sm"
          >
            {RANGE_OPTIONS.map((option) => (
              <SegmentedControlItem key={option.value} value={option.value} label={option.label} />
            ))}
          </SegmentedControl>
          <Selector
            label="Link"
            isLabelHidden
            size="sm"
            variant="secondary"
            options={linkOptions}
            value={linkId}
            onChange={onLinkChange}
            hasSearch={links.length > 8}
            width={200}
          />
        </>
      }
      endContent={
        <Switch
          size="sm"
          label="Compare to previous period"
          value={isComparing}
          onChange={onCompareChange}
        />
      }
    />
  )
}
