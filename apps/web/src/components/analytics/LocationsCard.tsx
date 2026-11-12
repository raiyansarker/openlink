import { useMemo, useState } from 'react'
import { Grid } from '@astryxdesign/core/Grid'
import { HStack } from '@astryxdesign/core/HStack'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import AnalyticsCard from '#/components/analytics/AnalyticsCard'
import RankedBars from '#/components/analytics/RankedBars'
import WorldBubbleMap from '#/components/analytics/WorldBubbleMap'
import { SERIES_COLORS } from '#/components/analytics/chart-theme'
import type { AnalyticsReport, BreakdownRow } from '#/lib/analytics/demo-dataset'
import { countryFlag } from '#/lib/analytics/flag'
import { OPENFREEMAP_CREDIT } from '#/lib/maps/load-maplibre'

type LocationsCardProps = {
  report: AnalyticsReport
  isComparing: boolean
}

type View = 'countries' | 'cities'

/** Where clicks come from: a bubble map plus ranked countries or cities. */
export default function LocationsCard({ report, isComparing }: LocationsCardProps) {
  const [view, setView] = useState<View>('countries')

  const rows = useMemo<BreakdownRow[]>(() => {
    if (view === 'countries') {
      return report.countries.map((c) => ({ ...c, label: `${countryFlag(c.code)}  ${c.label}` }))
    }
    const total = report.totals.clicks || 1
    return report.cities.map((c) => ({
      key: c.key,
      label: `${c.label}, ${c.country}`,
      clicks: c.clicks,
      previousClicks: 0,
      share: c.clicks / total,
    }))
  }, [report, view])

  return (
    <AnalyticsCard
      title="Locations"
      description={`${report.countries.length} countries · approximate, from IP address`}
      actions={
        <SegmentedControl
          label="Location detail"
          value={view}
          onChange={(value) => setView(value as View)}
          size="sm"
        >
          <SegmentedControlItem value="countries" label="Countries" />
          <SegmentedControlItem value="cities" label="Cities" />
        </SegmentedControl>
      }
    >
      <Grid columns={{ minWidth: 320, max: 2 }} gap={5} width="100%">
        <VStack gap={2} hAlign="stretch" width="100%">
          <WorldBubbleMap countries={report.countries} height={300} />
          <HStack>
            <Text type="supporting" color="secondary">
              {OPENFREEMAP_CREDIT}
            </Text>
          </HStack>
        </VStack>
        <RankedBars
          rows={rows}
          color={SERIES_COLORS[0]}
          label={`Clicks by ${view === 'countries' ? 'country' : 'city'}`}
          isComparing={isComparing && view === 'countries'}
          limit={9}
        />
      </Grid>
    </AnalyticsCard>
  )
}
