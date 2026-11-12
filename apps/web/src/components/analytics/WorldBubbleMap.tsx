import { useEffect, useRef, useState } from 'react'
import type {
  GeoJSONSource,
  GeoJSONSourceSpecification,
  Map as MapLibreMap,
} from 'maplibre-gl'
import { Card } from '@astryxdesign/core/Card'
import { Text } from '@astryxdesign/core/Text'
import { useResolvedColorScheme } from '#/hooks/use-resolved-color-scheme'
import type { CountryRow } from '#/lib/analytics/demo-dataset'
import { formatNumber } from '#/lib/analytics/format'
import {
  OPENFREEMAP_STYLES,
  loadMapLibre,
  resolveCssColor,
} from '#/lib/maps/load-maplibre'

type WorldBubbleMapProps = {
  countries: CountryRow[]
  height?: number
}

const SOURCE_ID = 'country-clicks'
const LAYER_ID = 'country-clicks-circles'

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
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const dataRef = useRef(countries)
  const scheme = useResolvedColorScheme()
  const [hasError, setHasError] = useState(false)

  dataRef.current = countries

  useEffect(() => {
    let isCancelled = false
    const container = containerRef.current
    if (!container) return

    void (async () => {
      try {
        const maplibre = await loadMapLibre()
        if (isCancelled) return
        const map = new maplibre.Map({
          container,
          style: OPENFREEMAP_STYLES[scheme],
          // Frame the populated world rather than a fixed zoom, so every
          // country fits whatever width the card has.
          bounds: [
            [-140, -42],
            [155, 64],
          ],
          fitBoundsOptions: { padding: 8 },
          interactive: false,
          attributionControl: false,
          fadeDuration: 0,
          renderWorldCopies: false,
        })

        const canvasLayer = map.getCanvasContainer()
        canvasLayer.style.transition = 'none'
        canvasLayer.style.opacity = '0'
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        const addBubbles = () => {
          // Place names collide with the bubbles; the list beside the map
          // already names every country, so hide the basemap's text layers.
          for (const layer of map.getStyle().layers ?? []) {
            if (layer.type === 'symbol') map.setLayoutProperty(layer.id, 'visibility', 'none')
          }
          const accent = resolveCssColor(container, '--color-data-categorical-blue', '#0171E3')
          if (!map.getSource(SOURCE_ID)) {
            map.addSource(SOURCE_ID, { type: 'geojson', data: toGeoJson(dataRef.current) })
          }
          if (!map.getLayer(LAYER_ID)) {
            map.addLayer({
              id: LAYER_ID,
              type: 'circle',
              source: SOURCE_ID,
              paint: {
                'circle-radius': ['interpolate', ['linear'], ['get', 'weight'], 0, 3, 1, 26],
                'circle-color': accent,
                'circle-opacity': 0.32,
                'circle-stroke-color': accent,
                'circle-stroke-width': 1.25,
                'circle-stroke-opacity': 0.9,
              },
            })
          }
        }

        let isLoaded = false
        map.on('error', () => {
          if (!isLoaded) setHasError(true)
        })
        // A style swap (light/dark) drops custom layers, so re-add them.
        map.on('style.load', addBubbles)
        map.once('idle', () => {
          isLoaded = true
          canvasLayer.style.transition = reduceMotion ? 'none' : 'opacity 180ms ease-out'
          canvasLayer.style.opacity = '1'
        })
        mapRef.current = map
      } catch {
        if (!isCancelled) setHasError(true)
      }
    })()

    return () => {
      isCancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
    // Created once; data and style updates are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const source = mapRef.current?.getSource(SOURCE_ID) as GeoJSONSource | undefined
    source?.setData(toGeoJson(countries))
  }, [countries])

  useEffect(() => {
    mapRef.current?.setStyle(OPENFREEMAP_STYLES[scheme])
  }, [scheme])

  const top = countries[0]

  return (
    <Card
      ref={containerRef}
      padding={0}
      variant="muted"
      height={height}
      role="img"
      aria-label={
        top
          ? `World map of clicks by country. Most clicks from ${top.label}: ${formatNumber(top.clicks)}.`
          : 'World map of clicks by country.'
      }
      style={{ width: '100%', overflow: 'hidden', position: 'relative' }}
    >
      {hasError ? (
        <Text type="supporting" color="secondary">
          Map unavailable
        </Text>
      ) : null}
    </Card>
  )
}
