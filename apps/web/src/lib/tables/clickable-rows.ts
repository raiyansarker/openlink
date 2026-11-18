import type { KeyboardEvent, MouseEvent } from 'react'
import type { TablePlugin } from '@astryxdesign/core/Table'

/** Clicks on a control inside the row (its menu, a button, a link) are that control's, not the row's. */
function isNestedControl(event: MouseEvent | KeyboardEvent): boolean {
  const target = event.target
  if (!(target instanceof Element) || target === event.currentTarget) return false
  return Boolean(target.closest('button, a, input, textarea, select, [role="menu"], [role="menuitem"]'))
}

/**
 * Makes each body row of a data-driven Table one focusable, clickable target:
 * Tab stops on the row (not on each cell), and a click, Enter or Space runs
 * `onOpen`, the same as rows in a List. Controls inside the row keep their own clicks.
 */
export function clickableRows<T extends Record<string, unknown>>(
  onOpen: (item: T) => void,
  /** Read out for the focused row, e.g. "Open Ada Lovelace". */
  label?: (item: T) => string,
): TablePlugin<T> {
  return {
    rowModel: 'flat',
    transformBodyRow: (props, item) => ({
      ...props,
      htmlProps: {
        ...props.htmlProps,
        tabIndex: 0,
        className: [props.htmlProps.className, 'ol-clickable-row', 'ol-focus-ring'].filter(Boolean).join(' '),
        ...(label ? { 'aria-label': label(item) } : {}),
        onClick: (event: MouseEvent<HTMLTableRowElement>) => {
          props.htmlProps.onClick?.(event)
          if (!isNestedControl(event)) onOpen(item)
        },
        onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
          props.htmlProps.onKeyDown?.(event)
          if (event.target !== event.currentTarget) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpen(item)
          }
        },
      },
    }),
  }
}
