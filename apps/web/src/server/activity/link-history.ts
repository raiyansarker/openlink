import { Effect } from 'effect'

import type { ActivityAction } from './actions'
import { listActivity, summarizeTarget } from './service'

export type LinkHistoryKind = 'edits' | 'hold'

/** One link's audit trail: pages of events, filtered by kind, plus totals for the header. */
export class LinkHistory {
  static readonly PAGE_SIZE = 30

  /** Which recorded actions each kind covers. */
  static readonly ACTIONS: Record<LinkHistoryKind, readonly ActivityAction[]> = {
    edits: ['link.created', 'link.updated', 'link.moved', 'link.tagged'],
    hold: ['link.held', 'link.released'],
  }

  static page(input: { organizationId: string; linkId: string; kind?: LinkHistoryKind; limit?: number; cursor?: string }) {
    return listActivity({
      organizationId: input.organizationId,
      target: { type: 'link', id: input.linkId },
      limit: input.limit ?? LinkHistory.PAGE_SIZE,
      ...(input.cursor ? { cursor: input.cursor } : {}),
      ...(input.kind ? { actions: LinkHistory.ACTIONS[input.kind] } : {}),
    })
  }

  /** Counts over every event on the link, in one query. */
  static summary(organizationId: string, linkId: string) {
    return summarizeTarget({ organizationId, target: { type: 'link', id: linkId }, kinds: LinkHistory.ACTIONS }).pipe(
      Effect.map(({ total, people, since, kinds }) => ({
        total,
        edits: kinds.edits,
        holds: kinds.hold,
        people,
        ...(since ? { since } : {}),
      })),
    )
  }
}
