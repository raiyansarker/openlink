/** Display helper: hide https:// in dashboard tables. */
export function stripUrlScheme(url: string): string {
  return url.replace(/^https?:\/\//, '')
}
