const compactNumberFormatter = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** Demo-friendly compact number formatting for dashboard metrics. */
export function formatCompactNumber(value: number): string {
  return compactNumberFormatter.format(value)
}
