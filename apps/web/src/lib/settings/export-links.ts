import type { ShortLink } from '#/data/demo/types'

export type LinkExportFormat = 'csv' | 'json'

const CSV_COLUMNS = [
  'id',
  'slug',
  'title',
  'targetUrl',
  'status',
  'clicks',
  'uniqueClicks',
  'tags',
  'createdAt',
] as const

/** Quote a CSV cell and neutralise spreadsheet formula injection. */
function csvCell(value: unknown): string {
  let text = Array.isArray(value) ? value.join(';') : String(value ?? '')
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

export function linksToCsv(links: ShortLink[]): string {
  const header = CSV_COLUMNS.join(',')
  const rows = links.map((link) =>
    CSV_COLUMNS.map((column) => csvCell(link[column])).join(','),
  )
  return [header, ...rows].join('\n')
}

export function linksToJson(links: ShortLink[]): string {
  return JSON.stringify(links, null, 2)
}

/** Trigger a browser download for a generated file. */
export function downloadFile(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function exportLinks(
  links: ShortLink[],
  format: LinkExportFormat,
  workspaceSlug: string,
) {
  const date = new Date().toISOString().slice(0, 10)
  const filename = `${workspaceSlug}-links-${date}.${format}`
  if (format === 'csv') {
    downloadFile(filename, linksToCsv(links), 'text/csv;charset=utf-8')
  } else {
    downloadFile(filename, linksToJson(links), 'application/json')
  }
}
