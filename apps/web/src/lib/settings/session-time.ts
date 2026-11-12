/** "Active now", "12m ago", "3h ago", "Yesterday", or a short date. */
export function formatLastActive(iso: string, now = Date.now()): string {
  const diffMin = Math.round((now - new Date(iso).getTime()) / 60_000)
  if (diffMin < 5) return 'Active now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.round(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffHours < 48) return 'Yesterday'
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
