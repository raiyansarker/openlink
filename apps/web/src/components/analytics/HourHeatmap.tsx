import { useMemo } from 'react'
import { cell, defineChart } from '@tanstack/charts'
import { Chart } from '@tanstack/charts/react'
import { scaleBand } from '@tanstack/charts/scales/band'
import { tooltip } from '@tanstack/charts/tooltip'
import { scaleQuantize } from 'd3-scale'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { BLUE_RAMP, chartHostStyle } from '#/components/analytics/chart-theme'
import type { AnalyticsReport } from '#/lib/analytics/demo-dataset'
import { formatCompact, formatNumber } from '#/lib/analytics/format'

type HourHeatmapProps = { report: AnalyticsReport }

function hourLabel(hour: string): string {
  const h = Number(hour)
  if (h === 0) return '12a'
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

/** When people click: weekday × hour of day, darker is busier. */
export default function HourHeatmap({ report }: HourHeatmapProps) {
  const max = useMemo(
    () => Math.max(1, ...report.heatmap.map((c) => c.clicks)),
    [report.heatmap],
  )

  const peak = useMemo(
    () => report.heatmap.reduce((best, c) => (c.clicks > best.clicks ? c : best)),
    [report.heatmap],
  )

  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          cell(report.heatmap, {
            x: 'hour',
            y: 'day',
            color: 'clicks',
            key: (row) => `${row.day}-${row.hour}`,
            inset: 1.5,
            radius: 3,
          }),
        ],
        scales: {
          x: {
            scale: () => scaleBand<string>().domain(report.heatmapHours).padding(0),
            axis: {
              ticks: {
                values: report.heatmapHours.filter((_, i) => i % 3 === 0),
                format: (value: string) => hourLabel(value),
              },
            },
          },
          y: {
            scale: () => scaleBand<string>().domain(report.heatmapDays).padding(0),
          },
        },
        color: {
          scale: () => scaleQuantize<string>().domain([0, max]).range([...BLUE_RAMP]),
        },
        tooltip: {
          use: tooltip,
          format: (point) =>
            `${point.datum.day} ${hourLabel(point.datum.hour)}–${hourLabel(
              String((Number(point.datum.hour) + 1) % 24).padStart(2, '0'),
            )}\n${formatNumber(point.datum.clicks)} clicks`,
        },
      }),
    [report.heatmap, report.heatmapDays, report.heatmapHours, max],
  )

  return (
    <VStack gap={3} hAlign="stretch" width="100%">
      <Chart
        definition={definition}
        height={250}
        initialWidth={720}
        style={chartHostStyle}
        ariaLabel="Clicks by weekday and hour of day"
        ariaDescription={`Busiest slot: ${peak.day} at ${hourLabel(peak.hour)} with ${formatNumber(peak.clicks)} clicks.`}
      />
      <HStack hAlign="between" vAlign="center" gap={3} width="100%" wrap="wrap">
        <Text type="supporting" color="secondary">
          Busiest: {peak.day} around {hourLabel(peak.hour)}
        </Text>
        <HStack gap={1} vAlign="center">
          <Text type="supporting" color="secondary">
            0
          </Text>
          <svg
            width={BLUE_RAMP.length * 16}
            height={10}
            viewBox={`0 0 ${BLUE_RAMP.length * 16} 10`}
            aria-hidden="true"
            focusable="false"
          >
            {BLUE_RAMP.map((color, i) => (
              <rect key={color} x={i * 16} width={14} height={10} rx={2} style={{ fill: color }} />
            ))}
          </svg>
          <Text type="supporting" color="secondary">
            {formatCompact(max)}
          </Text>
        </HStack>
      </HStack>
    </VStack>
  )
}
