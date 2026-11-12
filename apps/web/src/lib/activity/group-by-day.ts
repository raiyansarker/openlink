import { formatShortDate } from '#/lib/format/short-date'

export type DayGroup<T> = { key: string; label: string; items: T[] }

function startOfDay(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** "Today", "Yesterday", or a short date for older days. */
export function dayLabel(iso: string, now = new Date()): string {
  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000,
  )
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return formatShortDate(iso)
}

/** Groups items (already sorted newest first) into calendar days. */
export function groupByDay<T extends { occurredAt: string }>(
  items: T[],
): DayGroup<T>[] {
  const groups: DayGroup<T>[] = []
  for (const item of items) {
    const key = new Date(startOfDay(new Date(item.occurredAt))).toISOString()
    const last = groups.at(-1)
    if (last?.key === key) {
      last.items.push(item)
    } else {
      groups.push({ key, label: dayLabel(item.occurredAt), items: [item] })
    }
  }
  return groups
}

export function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}
