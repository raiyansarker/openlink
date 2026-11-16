import type { LinkHistoryEvent } from '#/data/demo/types'
import { ApiClient, type OpenLinkClient } from './client'

type ActivityDto = Awaited<ReturnType<OpenLinkClient['links']['getWorkspaceLinkHistory']>>['items'][number]

/** Activity events about one link, as timeline entries. */
export class HistoryMapper {
  private static readonly TYPES: Record<string, LinkHistoryEvent['type']> = {
    'link.created': 'created',
    'link.updated': 'updated',
    'link.moved': 'moved',
    'link.tagged': 'tagged',
    'link.held': 'held',
    'link.released': 'released',
  }

  static toUi(row: ActivityDto): LinkHistoryEvent | null {
    const type = HistoryMapper.TYPES[row.action]
    if (!type) return null
    const changes = row.changes ?? []
    return {
      id: row.id,
      at: row.occurredAt,
      actor: row.actor.label,
      ...(row.actor.imageUrl ? { actorImageUrl: row.actor.imageUrl } : {}),
      type,
      summary: HistoryMapper.summary(type, changes),
      ...(changes.length > 0 ? { changes } : {}),
    }
  }

  private static summary(type: LinkHistoryEvent['type'], changes: { label: string; to: string }[]): string {
    switch (type) {
      case 'created':
        return 'Created the link'
      case 'held':
        return 'Put the link on hold'
      case 'released':
        return 'Released the hold'
      case 'moved':
        return 'Moved to another folder'
      case 'tagged':
        return 'Changed tags'
      default:
        return changes.length === 1 ? `Changed ${changes[0]!.label.toLowerCase()}` : `Changed ${changes.length} settings`
    }
  }
}

type LinkRef = { organizationId: string; linkId: string }

/** A link's history, newest first. */
export class LinkHistoryApi {
  constructor(private readonly client: OpenLinkClient = ApiClient.instance) {}

  async list(ref: LinkRef): Promise<LinkHistoryEvent[]> {
    const { items } = await this.client.links.getWorkspaceLinkHistory({ params: ref })
    return items.flatMap((row) => HistoryMapper.toUi(row) ?? [])
  }
}
