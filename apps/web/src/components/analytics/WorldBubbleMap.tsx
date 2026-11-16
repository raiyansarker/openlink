import { useEffect, useMemo, useState } from 'react'
import { Layer, Source, useMap } from '@vis.gl/react-maplibre'
import type { GeoJSONSourceSpecification } from 'maplibre-gl'
import StaticMap from '#/components/maps/StaticMap'
import { useResolvedColorScheme } from '#/hooks/use-resolved-color-scheme'
import type { CountryRow } from '#/lib/analytics/demo-dataset'
import { formatNumber } from '#/lib/analytics/format'
import { resolveCssColor } from '#/lib/maps/load-maplibre'

type WorldBubbleMapProps = {
  countries: CountryRow[]
  height?: number
}

const ACCENT_TOKEN = '--color-data-categorical-blue'
const ACCENT_FALLBACK = '#0171E3'

/** Frame the populated world rather than a fixed zoom, so every country fits the card. */
const WORLD_VIEW = {
  bounds: [
    [-140, -42],
    [155, 64],
  ] as [[number, number], [number, number]],
  fitBoundsOptions: { padding: 8 },
}

function toGeoJson(countries: CountryRow[]): GeoJSONSourceSpecification['data'] {
  const max = Math.max(1, ...countries.map((c) => c.clicks))
  return {
    type: 'FeatureCollection',
    features: countries.map((country) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [country.lng, country.lat] },
      properties: {
        label: country.label,
        clicks: country.clicks,
        // 0..1 by area, so a bubble twice the size means twice the clicks.
        weight: Math.sqrt(country.clicks / max),
      },
    })),
  }
}

/**
 * Click volume by country as bubbles on an OpenFreeMap world map.
 * Non-interactive by design; exact numbers live in the list beside it.
 */
export default function WorldBubbleMap({ countries, height = 280 }: WorldBubbleMapProps) {
  const scheme = useResolvedColorScheme()
  // WebGL needs a concrete colour; tokens resolve in the browser, per scheme.
  const [accent, setAccent] = useState(ACCENT_FALLBACK)
  useEffect(() => {
    setAccent(resolveCssColor(document.body, ACCENT_TOKEN, ACCENT_FALLBACK))
  }, [scheme])

  const data = useMemo(() => toGeoJson(countries), [countries])
  const top = countries[0]

  return (
    <StaticMap
      height={height}
      initialViewState={WORLD_VIEW}
      renderWorldCopies={false}
      label={
        top
          ? `World map of clicks by country. Most clicks from ${top.label}: ${formatNumber(top.clicks)}.`
          : 'World map of clicks by country.'
      }
    >
      <HideBasemapLabels />
      <Source id="country-clicks" type="geojson" data={data}>
        <Layer
          id="country-clicks-circles"
          type="circle"
          paint={{
            'circle-radius': ['interpolate', ['linear'], ['get', 'weight'], 0, 3, 1, 26],
            'circle-color': accent,
            'circle-opacity': 0.32,
            'circle-stroke-color': accent,
            'circle-stroke-width': 1.25,
            'circle-stroke-opacity': 0.9,
          }}
        />
      </Source>
    </StaticMap>
  )
}

/**
 * Place names collide with the bubbles, and the list beside the map already
 * names every country, so hide the basemap's text layers (again after a
 * light/dark style swap).
 */
function HideBasemapLabels() {
  const { current: ref } = useMap()

  useEffect(() => {
    const map = ref?.getMap()
    if (!map) return
    const hide = () => {
      for (const layer of map.getStyle()?.layers ?? []) {
        if (layer.type === 'symbol' && map.getLayoutProperty(layer.id, 'visibility') !== 'none') {
          map.setLayoutProperty(layer.id, 'visibility', 'none')
        }
      }
    }
    if (map.isStyleLoaded()) hide()
    // A scheme swap diffs the new style in, which can turn labels back on.
    map.on('styledata', hide)
    return () => {
      map.off('styledata', hide)
    }
  }, [ref])

  return null
}
