import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl'
import { Switch } from '@astryxdesign/core/Switch'
import { Toolbar } from '@astryxdesign/core/Toolbar'
import { RANGE_OPTIONS, type AnalyticsRange } from '#/lib/analytics/demo-dataset'

export const ALL_LINKS = '__all__'

type AnalyticsToolbarProps = {
  range: AnalyticsRange
  onRangeChange: (range: AnalyticsRange) => void
  isComparing: boolean
  onCompareChange: (value: boolean) => void
}

/** Global filters: every panel below re-reads from these. Links are picked by clicking them. */
export default function AnalyticsToolbar({
  range,
  onRangeChange,
  isComparing,
  onCompareChange,
}: AnalyticsToolbarProps) {
  return (
    <Toolbar
      label="Analytics filters"
      size="sm"
      gap={3}
      startContent={
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
