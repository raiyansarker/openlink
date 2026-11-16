import { Marker } from '@vis.gl/react-maplibre'
import { Center } from '@astryxdesign/core/Center'
import StaticMap from '#/components/maps/StaticMap'

const MAP_HEIGHT = 200
const ZOOM = 9.5

type DeviceLocationMapProps = {
  lat: number
  lng: number
  /** Accessible description, e.g. "Approximate location: Dhaka, Bangladesh". */
  label: string
}

/** Approximate IP location on a small, non-interactive map. */
export default function DeviceLocationMap({ lat, lng, label }: DeviceLocationMapProps) {
  return (
    // Keyed so a different device re-centres the map.
    <StaticMap key={`${lat},${lng}`} height={MAP_HEIGHT} label={label} initialViewState={{ latitude: lat, longitude: lng, zoom: ZOOM }}>
      <Marker latitude={lat} longitude={lng}>
        <Center
          width={28}
          height={28}
          style={{
            borderRadius: 'var(--radius-full)',
            background: 'color-mix(in srgb, var(--color-accent) 22%, transparent)',
          }}
        >
          <Center
            width={12}
            height={12}
            style={{
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-accent)',
              boxShadow: '0 0 0 2px var(--color-background-surface)',
            }}
          >
            {null}
          </Center>
        </Center>
      </Marker>
    </StaticMap>
  )
}
