import { useMemo } from 'react'
import { areaY, defineChart, lineY } from '@tanstack/charts'
import { d3Curve } from '@tanstack/charts/d3/shape'
import { Chart } from '@tanstack/charts/react'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scaleTime } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'

type SparklinePoint = { time: Date; value: number }

type SparklineProps = {
  points: SparklinePoint[]
  color: string
  label: string
  height?: number
}

const smooth = d3Curve(curveMonotoneX)

/** Guide-free trend line with a faint fill, sized to its tile. */
export default function Sparkline({ points, color, label, height = 40 }: SparklineProps) {
  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          areaY(points, {
            x: 'time',
            y: 'value',
            fill: color,
            fillOpacity: 0.12,
            curve: smooth,
          }),
          lineY(points, {
            x: 'time',
            y: 'value',
            stroke: color,
            strokeWidth: 1.75,
            curve: smooth,
          }),
        ],
        scales: {
          x: { scale: scaleTime, axis: false },
          y: { scale: scaleLinear, axis: false, nice: 5 },
        },
        margin: 0,
      }),
    [points, color],
  )

  return (
    <Chart
      definition={definition}
      height={height}
      initialWidth={200}
      ariaLabel={label}
    />
  )
}
