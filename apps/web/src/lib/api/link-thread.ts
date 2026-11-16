import type { LinkComment, LinkHistoryEvent } from '#/data/demo/types'
import { ApiClient, type OpenLinkClient } from './client'
import { ApiError } from './error'

type CommentDto = Awaited<ReturnType<OpenLinkClient['comments']['listWorkspaceLinkComments']>>['items'][number]
type ActivityDto = Awaited<ReturnType<OpenLinkClient['links']['getWorkspaceLinkHistory']>>['items'][number]

export class CommentMapper {
  static toUi(row: CommentDto): LinkComment {
    return {
      id: row.id,
      at: row.createdAt,
      authorId: row.authorId ?? '',
      authorName: row.authorName,
      ...(row.authorImage ? { authorAvatarUrl: row.authorImage } : {}),
      body: row.body,
      ...(row.editedAt ? { editedAt: row.editedAt } : {}),
      reactions: row.reactions,
    }
  }
}

/** Activity events about one link, as timeline entries. */
export class HistoryMapper {
  private static readonly TYPES: Record<string, LinkHistoryEvent['type']> = {
    'link.created': 'created',
    'link.updated': 'updated',
    'link.moved': 'moved',
    'link.tagged': 'tagged',
    'link.held': 'held',
    'link.released': 'released',
    'link.commented': 'commented',
  }

  static toUi(row: ActivityDto): LinkHistoryEvent | null {
    const type = HistoryMapper.TYPES[row.action]
    if (!type) return null
    const changes = row.changes ?? []
    return {
      id: row.id,
      at: row.occurredAt,
      actor: row.actor.label,
      type,
      summary: HistoryMapper.summary(type, changes),
      ...(changes.length > 0 && type !== 'commented' ? { changes } : {}),
      ...(type === 'commented' && changes[0] ? { excerpt: changes[0].to } : {}),
    }
  }

  private static summary(type: LinkHistoryEvent['type'], changes: { label: string; to: string }[]): string {
    switch (type) {
      case 'created':
        return 'Created the link'
      case 'commented':
        return 'Left a comment'
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

/** A link's comment thread and history. Mutations throw `ApiError` with a message to show. */
export class LinkThreadApi {
  constructor(private readonly client: OpenLinkClient = ApiClient.instance) {}

  async comments(ref: LinkRef): Promise<LinkComment[]> {
    const { items } = await this.client.comments.listWorkspaceLinkComments({ params: ref })
    return items.map(CommentMapper.toUi)
  }

  async history(ref: LinkRef): Promise<LinkHistoryEvent[]> {
    const { items } = await this.client.links.getWorkspaceLinkHistory({ params: ref })
    return items.flatMap((row) => HistoryMapper.toUi(row) ?? [])
  }

  addComment(ref: LinkRef, body: string) {
    return this.call(
      async () => CommentMapper.toUi(await this.client.comments.createWorkspaceLinkComment({ params: ref, body: { body } })),
      'Could not post the comment.',
    )
  }

  editComment(ref: LinkRef, commentId: string, body: string) {
    return this.call(
      async () =>
        CommentMapper.toUi(await this.client.comments.updateWorkspaceLinkComment({ params: { ...ref, commentId }, body: { body } })),
      'Could not save the comment.',
    )
  }

  deleteComment(ref: LinkRef, commentId: string) {
    return this.call(
      () => this.client.comments.deleteWorkspaceLinkComment({ params: { ...ref, commentId } }),
      'Could not delete the comment.',
    )
  }

  toggleReaction(ref: LinkRef, commentId: string, emoji: string) {
    return this.call(
      async () =>
        CommentMapper.toUi(await this.client.comments.toggleWorkspaceCommentReaction({ params: { ...ref, commentId }, body: { emoji } })),
      'Could not react.',
    )
  }

  private async call<T>(run: () => Promise<T>, fallback: string): Promise<T> {
    try {
      return await run()
    } catch (error) {
      throw ApiError.from(error, fallback)
    }
  }
}
