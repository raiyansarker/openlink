import { useMemo } from 'react'
import { defineChart } from '@tanstack/charts'
import { pie, polar, radialArc } from '@tanstack/charts/polar'
import { Chart } from '@tanstack/charts/react'
import { tooltip } from '@tanstack/charts/tooltip'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { SERIES_COLORS, chartHostStyle } from '#/components/analytics/chart-theme'
import type { BreakdownRow } from '#/lib/analytics/demo-dataset'
import { formatDelta, formatNumber, formatPercent } from '#/lib/analytics/format'

type DeviceDonutProps = {
  rows: BreakdownRow[]
  isComparing: boolean
}

const DONUT_SIZE = 168

/** Device split as a donut, with an exact-value legend beside it. */
export default function DeviceDonut({ rows, isComparing }: DeviceDonutProps) {
  const definition = useMemo(() => {
    const slices = pie(rows, { value: 'clicks', gapAngle: 0.03 })
    return defineChart({
      marks: [
        polar({
          inset: 4,
          marks: [
            radialArc(slices, {
              innerRadius: ({ radius }) => radius * 0.64,
              cornerRadius: 4,
              color: 'label',
              key: 'key',
            }),
          ],
          scales: { angle: null, radius: null },
        }),
      ],
      scales: { x: null, y: null },
      color: {
        domain: rows.map((r) => r.label),
        range: rows.map((_, i) => SERIES_COLORS[i % SERIES_COLORS.length]),
      },
      tooltip: {
        use: tooltip,
        format: (point) =>
          `${point.datum.label}\n${formatNumber(point.datum.clicks)} clicks · ${formatPercent(point.datum.share)}`,
      },
    })
  }, [rows])

  return (
    <HStack gap={6} vAlign="center" width="100%" wrap="wrap">
      <Chart
        definition={definition}
        width={DONUT_SIZE}
        height={DONUT_SIZE}
        style={chartHostStyle}
        ariaLabel="Clicks by device type"
      />
      <VStack gap={3} hAlign="stretch" style={{ flex: '1 1 160px', minWidth: 0 }}>
        {rows.map((row, i) => {
          const delta = formatDelta(row.clicks, row.previousClicks)
          return (
            <HStack key={row.key} hAlign="between" vAlign="center" gap={3} width="100%">
              <HStack gap={2} vAlign="center">
                <svg width={10} height={10} aria-hidden="true" focusable="false">
                  <circle cx={5} cy={5} r={5} style={{ fill: SERIES_COLORS[i % SERIES_COLORS.length] }} />
                </svg>
                <Text>{row.label}</Text>
              </HStack>
              <HStack gap={3} vAlign="center">
                <Text weight="semibold">{formatPercent(row.share)}</Text>
                <Text type="supporting" color="secondary">
                  {isComparing && delta ? delta : formatNumber(row.clicks)}
                </Text>
              </HStack>
            </HStack>
          )
        })}
      </VStack>
    </HStack>
  )
}
