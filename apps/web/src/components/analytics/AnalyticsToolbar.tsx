import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl'
import { Switch } from '@astryxdesign/core/Switch'
import { Toolbar } from '@astryxdesign/core/Toolbar'
import { VStack } from '@astryxdesign/core/VStack'
import { ScrollableArea } from '@astryxdesign/core/ScrollableArea'
import { useIsPhone } from '#/hooks/use-is-phone'
import { RANGE_OPTIONS, type AnalyticsRange } from '#/lib/analytics/report'

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
  // On phones the two controls can't share one row without the switch label
  // colliding into the segmented control, so they stack (range first).
  const isPhone = useIsPhone()
  const rangeControl = (
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
  )
  const compareControl = (
    <Switch
      size="sm"
      label={isPhone ? 'Compare' : 'Compare to previous period'}
      value={isComparing}
      onChange={onCompareChange}
    />
  )

  if (isPhone) {
    return (
      <VStack gap={3} width="fill" hAlign="stretch" aria-label="Analytics filters">
        <ScrollableArea axis="inline" label="Time range" width="fill">
          {rangeControl}
        </ScrollableArea>
        {compareControl}
      </VStack>
    )
  }

  return (
    <Toolbar
      label="Analytics filters"
      size="sm"
      gap={3}
      startContent={rangeControl}
      endContent={compareControl}
    />
  )
}
