import { useState } from 'react'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl'
import AnalyticsCard from '#/components/analytics/AnalyticsCard'
import DeviceDonut from '#/components/analytics/DeviceDonut'
import RankedBars from '#/components/analytics/RankedBars'
import { SERIES_COLORS } from '#/components/analytics/chart-theme'
import type { AnalyticsReport } from '#/lib/analytics/demo-dataset'

type TechnologyCardProps = {
  report: AnalyticsReport
  isComparing: boolean
}

type View = 'devices' | 'browsers' | 'os'

/** What people click with: device type, browser, and operating system. */
export default function TechnologyCard({ report, isComparing }: TechnologyCardProps) {
  const [view, setView] = useState<View>('devices')

  return (
    <AnalyticsCard
      title="Devices"
      actions={
        <SegmentedControl
          label="Technology detail"
          value={view}
          onChange={(value) => setView(value as View)}
          size="sm"
        >
          <SegmentedControlItem value="devices" label="Type" />
          <SegmentedControlItem value="browsers" label="Browser" />
          <SegmentedControlItem value="os" label="OS" />
        </SegmentedControl>
      }
    >
      {view === 'devices' ? (
        <DeviceDonut rows={report.devices} isComparing={isComparing} />
      ) : (
        <RankedBars
          rows={view === 'browsers' ? report.browsers : report.operatingSystems}
          color={SERIES_COLORS[2]}
          label={view === 'browsers' ? 'Clicks by browser' : 'Clicks by operating system'}
          isComparing={isComparing}
          limit={6}
        />
      )}
    </AnalyticsCard>
  )
}
