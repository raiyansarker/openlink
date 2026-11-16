import { HoldPages, type HoldPageId } from '@openlink/contracts'

export type HoldPageMeta = ReturnType<typeof HoldPages.get> & { page: HoldPageId }

/** Hold pages in picker order; copy comes from the shared catalogue the live page uses. */
export const HOLD_PAGES: HoldPageMeta[] = HoldPages.IDS.map((page) => ({ page, ...HoldPages.get(page) }))

export function holdPageMeta(page: HoldPageId): HoldPageMeta {
  return { page, ...HoldPages.get(page) }
}
