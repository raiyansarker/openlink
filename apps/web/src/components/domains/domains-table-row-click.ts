import type { MouseEvent } from 'react'

/** Open row details unless the click landed on a nested control (menu, button, link). */
export function shouldIgnoreDomainsTableRowClick(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true
  return Boolean(
    target.closest(
      'button, a, input, textarea, select, [role="menu"], [role="menuitem"]',
    ),
  )
}

export function domainTableBodyRowIndex(
  target: EventTarget | null,
): number | null {
  if (!(target instanceof Element)) return null
  const rowEl = target.closest('.astryx-table-row')
  if (!rowEl) return null
  const body = rowEl.closest('.astryx-table-body')
  if (!body) return null
  const rows = body.querySelectorAll('.astryx-table-row')
  const index = Array.from(rows).indexOf(rowEl)
  return index >= 0 ? index : null
}

export function handleDomainsTableRowClick(
  event: MouseEvent,
  rowCount: number,
  onRow: (index: number) => void,
): void {
  if (shouldIgnoreDomainsTableRowClick(event.target)) return
  const index = domainTableBodyRowIndex(event.target)
  if (index == null || index >= rowCount) return
  onRow(index)
}
