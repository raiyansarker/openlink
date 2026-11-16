import { type } from 'arktype'

import { OrganizationIdPath } from '../organizations/schema'

export const ActivityCategory = type("'links' | 'domains' | 'members' | 'security' | 'developers'")
export const ActivitySource = type("'dashboard' | 'api' | 'automation'")

export const ActivityChange = type({
  label: 'string',
  from: 'string',
  to: 'string',
})

export const ActivityEvent = type({
  id: 'string',
  organizationId: 'string',
  /** Machine key, e.g. `link.created`. */
  action: 'string',
  /** Past-tense phrase for display, e.g. "created link". */
  phrase: 'string',
  category: ActivityCategory,
  source: ActivitySource,
  actor: type({
    type: "'member' | 'api_key' | 'system'",
    label: 'string',
    'userId?': 'string',
    /** The member's profile picture, when they have one. */
    'imageUrl?': 'string',
  }),
  target: type({
    type: 'string',
    'id?': 'string',
    label: 'string',
  }),
  'changes?': ActivityChange.array(),
  /** Only returned to administrators. */
  'ipAddress?': 'string',
  occurredAt: 'string',
})

export const ListActivityQuery = type({
  'category?': ActivityCategory,
  'limit?': 'string.integer.parse',
  'cursor?': 'string',
  /** Only what this member did (their user id). */
  'actor?': 'string',
  /** Matches the person, the action ("created link") or the item. */
  'q?': 'string <= 100',
})

export const ListActivityResponse = type({
  items: ActivityEvent.array(),
  'nextCursor?': 'string',
})

/** Kinds of link history: edits to the link, or putting it on hold and releasing it. */
export const LinkHistoryKind = type("'edits' | 'hold'")

export const LinkHistoryQuery = type({
  'kind?': LinkHistoryKind,
  'limit?': 'string.integer.parse',
  'cursor?': 'string',
})

/** Totals over the link's whole history, whatever page or kind was asked for. */
export const LinkHistorySummary = type({
  total: 'number',
  edits: 'number',
  holds: 'number',
  people: 'number',
  'since?': 'string',
})

export const LinkHistoryResponse = type({
  items: ActivityEvent.array(),
  'nextCursor?': 'string',
  /** Only on the first page (no cursor). */
  'summary?': LinkHistorySummary,
})

export { OrganizationIdPath }
