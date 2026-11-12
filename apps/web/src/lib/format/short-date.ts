const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function formatShortDate(iso: string): string {
  return shortDateFormatter.format(new Date(iso))
}
