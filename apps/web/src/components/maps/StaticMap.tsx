import { useEffect, useState, type ReactNode } from 'react'
import { AttributionControl, Map, useMap, type MapProps } from '@vis.gl/react-maplibre'
import { Card } from '@astryxdesign/core/Card'
import { Center } from '@astryxdesign/core/Center'
import { Text } from '@astryxdesign/core/Text'
import { useResolvedColorScheme } from '#/hooks/use-resolved-color-scheme'
import { OPENFREEMAP_STYLES, loadMapLibre } from '#/lib/maps/load-maplibre'

type StaticMapProps = Pick<MapProps, 'initialViewState' | 'renderWorldCopies'> & {
  height: number
  /** Accessible description of what the map shows. */
  label: string
  /** Sources, layers and markers. */
  children?: ReactNode
}

/**
 * A non-interactive OpenFreeMap view in a card, following the app's colour
 * scheme. It fades in after the first full render so blank tiles never flash.
 */
export default function StaticMap({ height, label, children, ...view }: StaticMapProps) {
  const scheme = useResolvedColorScheme()
  const [isReady, setIsReady] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  return (
    <Card
      padding={0}
      variant="muted"
      height={height}
      role="img"
      aria-label={label}
      style={{ width: '100%', overflow: 'hidden', position: 'relative' }}
    >
      {hasError ? (
        <Center height="100%">
          <Text type="supporting" color="secondary">
            Map unavailable
          </Text>
        </Center>
      ) : (
        <Map
          mapLib={loadMapLibre()}
          mapStyle={OPENFREEMAP_STYLES[scheme]}
          {...view}
          interactive={false}
          attributionControl={false}
          fadeDuration={0}
          style={{
            width: '100%',
            height: '100%',
            opacity: isReady ? 1 : 0,
            transition: reduceMotion ? 'none' : 'opacity 180ms ease-out',
          }}
          onIdle={() => setIsReady(true)}
          onError={() => {
            // Sources can fail while React renders them; report it afterwards.
            if (!isReady) queueMicrotask(() => setHasError(true))
          }}
        >
          {/*<CollapsedAttribution />*/}
          {children}
        </Map>
      )}
    </Card>
  )
}

/**
 * The OpenStreetMap and OpenFreeMap licences require attribution, so it stays
 * one tap away behind MapLibre's ⓘ. MapLibre expands the compact control the
 * first time it becomes compact; fold it once, then leave toggling to MapLibre.
 */
function CollapsedAttribution() {
  const { current: map } = useMap()

  useEffect(() => {
    const control = map?.getContainer().querySelector('.maplibregl-ctrl-attrib')
    if (!control) return
    const fold = () => {
      if (!control.classList.contains('maplibregl-compact-show')) return false
      control.classList.remove('maplibregl-compact-show')
      return true
    }
    if (fold()) return
    const observer = new MutationObserver(() => {
      if (fold()) observer.disconnect()
    })
    observer.observe(control, { attributes: true, attributeFilter: ['class'] })
    // A tap before MapLibre expands it means the person wants it open.
    control.addEventListener('click', () => observer.disconnect(), { once: true })
    return () => observer.disconnect()
  }, [map])

  return <AttributionControl compact />
}
