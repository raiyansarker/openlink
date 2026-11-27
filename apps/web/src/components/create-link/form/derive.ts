import type { ISODateTimeString } from '@astryxdesign/core/DateTimeInput'
import {
  applyUtm,
  cleanUtm,
  isHttpUrl,
  normalizeUrl,
  type CreateLinkDraft,
} from '#/lib/links/create-link'

/** "YYYY-MM-DDTHH:mm" in local time, the DateTimeInput value format. */
export function toLocalInputValue(date: Date): ISODateTimeString {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}` as ISODateTimeString
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function formatLocal(value: string | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date)
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function rowId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/** The destination as a valid http(s) URL, or '' while it isn't one yet. */
export function validDestination(draft: Pick<CreateLinkDraft, 'destination'>): string {
  const destination = normalizeUrl(draft.destination)
  return isHttpUrl(destination) ? destination : ''
}

/** The destination with UTM applied; '' when it's invalid. */
export function finalDestinationOf(
  draft: Pick<CreateLinkDraft, 'destination' | 'utmEnabled' | 'utm'>,
): string {
  const destination = validDestination(draft)
  if (!destination) return ''
  return applyUtm(destination, draft.utmEnabled ? cleanUtm(draft.utm) : undefined)
}

/** The final URL only when UTM parameters actually change it. */
export function utmFinalUrlOf(
  draft: Pick<CreateLinkDraft, 'destination' | 'utmEnabled' | 'utm'>,
): string {
  if (!draft.utmEnabled || !cleanUtm(draft.utm)) return ''
  return finalDestinationOf(draft)
}
