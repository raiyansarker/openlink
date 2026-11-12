export type TimezoneOption = { value: string; label: string }

const FALLBACK_ZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Dhaka',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Australia/Sydney',
]

function offsetLabel(zone: string, at: Date): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'shortOffset',
    })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')
    return part?.value.replace('GMT', 'UTC') ?? 'UTC'
  } catch {
    return 'UTC'
  }
}

/** Every IANA zone the browser knows, labelled "UTC+6 · Asia/Dhaka". */
export function getTimezoneOptions(at = new Date()): TimezoneOption[] {
  const zones =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : FALLBACK_ZONES
  const all = zones.includes('UTC') ? zones : ['UTC', ...zones]
  return all.map((zone) => ({
    value: zone,
    label: `${offsetLabel(zone, at)} · ${zone.replaceAll('_', ' ')}`,
  }))
}

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** Current wall-clock time in a zone, e.g. "3:42 PM". */
export function currentTimeIn(zone: string, at = new Date()): string {
  try {
    return at.toLocaleTimeString(undefined, {
      timeZone: zone,
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}
