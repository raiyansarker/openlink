import type { ActivityCategory, ActivitySource, WorkspaceActivityEvent } from '#/data/demo/workspace-activity'
import { ApiClient, type OpenLinkClient } from './client'

type ActivityDto = Awaited<ReturnType<OpenLinkClient['activity']['listActivity']>>['items'][number]

export type ActivityFilters = {
  category?: ActivityCategory
  /** Free-text search, matched on the server. */
  q?: string
  /** Only this member's actions (user id). */
  actor?: string
}

export type ActivityPage = { items: WorkspaceActivityEvent[]; nextCursor?: string }

/** API activity events ↔ the feed's rows. */
export class ActivityMapper {
  private static readonly SOURCES: Record<ActivityDto['source'], ActivitySource> = {
    dashboard: 'Dashboard',
    api: 'API',
    automation: 'Automation',
  }

  static toUi(row: ActivityDto): WorkspaceActivityEvent {
    const actor: WorkspaceActivityEvent['actor'] =
      row.actor.type === 'member'
        ? { kind: 'member', name: row.actor.label, ...(row.actor.imageUrl ? { avatarUrl: row.actor.imageUrl } : {}) }
        : row.actor.type === 'api_key'
          ? { kind: 'api-key', name: row.actor.label }
          : { kind: 'system', name: row.actor.label }
    return {
      id: row.id,
      orgId: row.organizationId,
      actor,
      action: row.phrase,
      target: row.target.label,
      category: row.category,
      source: ActivityMapper.SOURCES[row.source],
      occurredAt: row.occurredAt,
      ...(row.changes?.length
        ? { details: row.changes.map((change) => ({ label: change.label, value: `${change.from || '—'} → ${change.to || '—'}` })) }
        : {}),
      ...(row.ipAddress ? { ipAddress: row.ipAddress } : {}),
    }
  }
}

/** A workspace's activity, newest first, one page at a time. */
export class ActivityApi {
  static readonly PAGE_SIZE = 30

  constructor(private readonly client: OpenLinkClient = ApiClient.instance) {}

  async page(organizationId: string, filters: ActivityFilters, cursor?: string, limit = ActivityApi.PAGE_SIZE): Promise<ActivityPage> {
    const q = filters.q?.trim()
    const { items, nextCursor } = await this.client.activity.listActivity({
      params: { organizationId },
      query: {
        limit: String(limit),
        ...(cursor ? { cursor } : {}),
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.actor ? { actor: filters.actor } : {}),
        ...(q ? { q } : {}),
      },
    })
    return { items: items.map(ActivityMapper.toUi), ...(nextCursor ? { nextCursor } : {}) }
  }
}
