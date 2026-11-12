import { useEffect, useRef, useState } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { Card } from '@astryxdesign/core/Card'
import { Text } from '@astryxdesign/core/Text'
import { useResolvedColorScheme } from '#/hooks/use-resolved-color-scheme'
import { OPENFREEMAP_STYLES, loadMapLibre } from '#/lib/maps/load-maplibre'


const MAP_HEIGHT = 200
const ZOOM = 9.5

type DeviceLocationMapProps = {
  lat: number
  lng: number
  /** Accessible description, e.g. "Approximate location: Dhaka, Bangladesh". */
  label: string
}

/** Builds the marker node; MapLibre needs a real DOM element for markers. */
function createMarkerElement(): HTMLElement {
  const halo = document.createElement('span')
  Object.assign(halo.style, {
    position: 'relative',
    display: 'block',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'color-mix(in srgb, var(--color-accent) 22%, transparent)',
  })
  const dot = document.createElement('span')
  Object.assign(dot.style, {
    position: 'absolute',
    inset: '8px',
    borderRadius: '50%',
    background: 'var(--color-accent)',
    boxShadow: '0 0 0 2px var(--color-background-surface)',
  })
  halo.appendChild(dot)
  return halo
}

/**
 * Non-interactive OpenFreeMap tile view centred on an approximate IP location.
 * MapLibre touches `window`, so it is imported lazily on the client only.
 */
export default function DeviceLocationMap({ lat, lng, label }: DeviceLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const scheme = useResolvedColorScheme()
  const [hasError, setHasError] = useState(false)

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
          center: [lng, lat],
          zoom: ZOOM,
          interactive: false,
          // The required credit is rendered as text under the map instead.
          attributionControl: false,
          fadeDuration: 0,
        })

        // Hide the map layers until the first full render, so the blank
        // canvas and late tiles never flash.
        const canvasLayer = map.getCanvasContainer()
        const controlLayer = container.querySelector<HTMLElement>(
          '.maplibregl-control-container',
        )
        const layers = [canvasLayer, controlLayer].filter(
          (el): el is HTMLElement => el != null,
        )
        const reduceMotion = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches
        for (const layer of layers) {
          layer.style.transition = 'none'
          layer.style.opacity = '0'
        }

        let isLoaded = false
        map.on('error', () => {
          if (!isLoaded) setHasError(true)
        })
        map.once('idle', () => {
          isLoaded = true
          for (const layer of layers) {
            layer.style.transition = reduceMotion ? 'none' : 'opacity 180ms ease-out'
            layer.style.opacity = '1'
          }
        })
        new maplibre.Marker({ element: createMarkerElement() })
          .setLngLat([lng, lat])
          .addTo(map)
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
    // Recreate when the location changes; the style is swapped separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])

  useEffect(() => {
    mapRef.current?.setStyle(OPENFREEMAP_STYLES[scheme])
  }, [scheme])

  return (
    <Card
      ref={containerRef}
      padding={0}
      variant="muted"
      height={MAP_HEIGHT}
      role="img"
      aria-label={label}
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
