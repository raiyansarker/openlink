import { useState } from 'react'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl'
import AnalyticsCard from '#/components/analytics/AnalyticsCard'
import RankedBars from '#/components/analytics/RankedBars'
import { SERIES_COLORS } from '#/components/analytics/chart-theme'
import type { AnalyticsReport } from '#/lib/analytics/demo-dataset'
import { formatPercent } from '#/lib/analytics/format'

type SourcesCardProps = {
  report: AnalyticsReport
  isComparing: boolean
}

type View = 'referrers' | 'channels'

/** Where clicks come from: specific referring sites, or the channel they belong to. */
export default function SourcesCard({ report, isComparing }: SourcesCardProps) {
  const [view, setView] = useState<View>('referrers')
  const direct = report.channels.find((c) => c.key === 'direct')

  return (
    <AnalyticsCard
      title="Top sources"
      description={
        direct ? `${formatPercent(direct.share)} arrive directly, with no referrer` : undefined
      }
      actions={
        <SegmentedControl
          label="Source detail"
          value={view}
          onChange={(value) => setView(value as View)}
          size="sm"
        >
          <SegmentedControlItem value="referrers" label="Referrers" />
          <SegmentedControlItem value="channels" label="Channels" />
        </SegmentedControl>
      }
    >
      <RankedBars
        rows={view === 'referrers' ? report.referrers : report.channels}
        color={SERIES_COLORS[1]}
        label={view === 'referrers' ? 'Clicks by referrer' : 'Clicks by channel'}
        isComparing={isComparing}
        limit={7}
      />
    </AnalyticsCard>
  )
}
