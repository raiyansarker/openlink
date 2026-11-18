import type { LinkFolder, ShortLink, ShortLinkStatus } from '#/data/demo/types'
import type { DeleteFolderMode } from '#/lib/links/folder-tree'
import { ApiClient, type OpenLinkClient } from './client'
import { ApiError } from './error'

type LinkDto = Awaited<ReturnType<OpenLinkClient['links']['getWorkspaceLink']>>
type FolderDto = Awaited<ReturnType<OpenLinkClient['folders']['createFolder']>>
type CreateBody = Parameters<OpenLinkClient['links']['createWorkspaceLink']>[0]['body']
type UpdateBody = Parameters<OpenLinkClient['links']['updateWorkspaceLink']>[0]['body']

/** API links ↔ the shape the links screens render. */
export class LinkMapper {
  static status(status: LinkDto['status']): ShortLinkStatus {
    if (status === 'scheduled') return 'scheduled'
    if (status === 'active') return 'active'
    if (status === 'paused' || status === 'draft') return 'paused'
    return 'archived'
  }

  static toShortLink(row: LinkDto): ShortLink {
    const userMeta = Object.fromEntries(Object.entries(row.metadata ?? {}).map(([k, v]) => [k, String(v)]))
    const utm = row.utm as ShortLink['utm']
    return {
      id: row.id,
      orgId: row.organizationId,
      slug: row.slug,
      title: row.title ?? row.slug,
      ...(row.description ? { description: row.description } : {}),
      targetUrl: LinkMapper.withUtm(row.destinationUrl, utm),
      destinationUrl: row.destinationUrl,
      clicks: row.clickCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      status: LinkMapper.status(row.status),
      tags: row.tags ?? [],
      folderId: row.folderId ?? null,
      domainId: row.domainId,
      redirectStatus: row.redirectStatus,
      ...(row.activateAt ? { activateAt: row.activateAt } : {}),
      ...(row.expiresAt ? { expiresAt: row.expiresAt } : {}),
      ...(row.maxClicks ? { maxClicks: row.maxClicks } : {}),
      ...(row.passwordProtected ? { passwordProtected: true } : {}),
      ...(row.expiredDestinationUrl ? { expiredDestinationUrl: row.expiredDestinationUrl } : {}),
      ...(row.fallbackDestinationUrl ? { fallbackDestinationUrl: row.fallbackDestinationUrl } : {}),
      ...(utm ? { utm } : {}),
      ...(Object.keys(userMeta).length > 0 ? { metadata: userMeta } : {}),
      ...(row.hold ? { hold: row.hold } : {}),
      ...(row.targeting ? { targeting: row.targeting } : {}),
      ...(row.cloaked ? { cloaked: true } : {}),
      ...(row.socialPreview ? { socialPreview: row.socialPreview } : {}),
    }
  }

  /** The fields a draft-built link sends to the API. */
  static toBody(link: ShortLink, password?: string): CreateBody {
    return {
      destinationUrl: link.destinationUrl ?? link.targetUrl,
      title: link.title,
      ...(link.description ? { description: link.description } : {}),
      redirectStatus: link.redirectStatus ?? 302,
      ...(link.activateAt ? { activateAt: link.activateAt } : {}),
      ...(link.expiresAt ? { expiresAt: link.expiresAt } : {}),
      ...(link.maxClicks ? { maxClicks: link.maxClicks } : {}),
      ...(password ? { password } : {}),
      ...(link.expiredDestinationUrl ? { expiredDestinationUrl: link.expiredDestinationUrl } : {}),
      ...(link.fallbackDestinationUrl ? { fallbackDestinationUrl: link.fallbackDestinationUrl } : {}),
      tags: link.tags,
      ...(link.utm ? { utm: link.utm } : {}),
      ...(link.metadata ? { metadata: link.metadata } : {}),
      folderId: link.folderId ?? null,
      ...(link.hold ? { hold: link.hold } : {}),
      ...(link.targeting ? { targeting: link.targeting } : {}),
      cloaked: link.cloaked === true,
      ...(link.socialPreview ? { socialPreview: link.socialPreview } : {}),
    }
  }

  /** A full replacement for an edit: settings the link no longer has are cleared. */
  static toUpdateBody(link: ShortLink, password?: string): UpdateBody {
    // Every optional setting is sent, as null when off, so turning one off clears it.
    return {
      ...LinkMapper.toBody(link, password),
      description: link.description ?? null,
      activateAt: link.activateAt ?? null,
      expiresAt: link.expiresAt ?? null,
      maxClicks: link.maxClicks ?? null,
      expiredDestinationUrl: link.expiredDestinationUrl ?? null,
      fallbackDestinationUrl: link.fallbackDestinationUrl ?? null,
      utm: link.utm ?? null,
      metadata: link.metadata ?? null,
      hold: link.hold ?? null,
      targeting: link.targeting ?? null,
      socialPreview: link.socialPreview ?? null,
    }
  }

  private static withUtm(url: string, utm: ShortLink['utm']) {
    if (!utm) return url
    try {
      const parsed = new URL(url)
      for (const [key, value] of Object.entries(utm)) {
        if (value && !parsed.searchParams.has(`utm_${key}`)) parsed.searchParams.set(`utm_${key}`, value)
      }
      return parsed.toString()
    } catch {
      return url
    }
  }
}

export class FolderMapper {
  static toUi(row: FolderDto): LinkFolder {
    return { id: row.id, orgId: row.organizationId, parentId: row.parentId ?? null, name: row.name, createdAt: row.createdAt }
  }
}

/** Links and folders of one workspace. Mutations throw `ApiError` with a message to show. */
export class LinksApi {
  static readonly PAGE = 200
  /** Safety cap for one workspace list; the browser filters and searches locally. */
  static readonly MAX_LINKS = 2000

  constructor(private readonly client: OpenLinkClient = ApiClient.instance) {}

  async listLinks(organizationId: string): Promise<ShortLink[]> {
    const links: ShortLink[] = []
    for (let offset = 0; offset < LinksApi.MAX_LINKS; offset += LinksApi.PAGE) {
      const page = await this.client.links.listOrganizationLinks({
        params: { organizationId },
        query: { limit: String(LinksApi.PAGE), offset: String(offset) },
      })
      links.push(...page.items.map(LinkMapper.toShortLink))
      if (links.length >= page.total || page.items.length === 0) break
    }
    return links
  }

  async listFolders(organizationId: string): Promise<LinkFolder[]> {
    const { items } = await this.client.folders.listFolders({ params: { organizationId } })
    return items.map(FolderMapper.toUi)
  }

  createLink(organizationId: string, link: ShortLink, password?: string) {
    return this.call(async () => {
      const body = { ...LinkMapper.toBody(link, password), slug: link.slug, domainId: link.domainId ?? null }
      return LinkMapper.toShortLink(await this.client.links.createWorkspaceLink({ params: { organizationId }, body }))
    }, 'Could not create the link.')
  }

  updateLink(organizationId: string, linkId: string, body: UpdateBody) {
    return this.call(
      async () => LinkMapper.toShortLink(await this.client.links.updateWorkspaceLink({ params: { organizationId, linkId }, body })),
      'Could not save the link.',
    )
  }

  deleteLinks(organizationId: string, linkIds: string[]) {
    return this.call(() => this.client.links.deleteLinks({ params: { organizationId }, body: { linkIds } }), 'Could not delete.')
  }

  moveLinks(organizationId: string, linkIds: string[], folderId: string | null) {
    return this.call(() => this.client.links.moveLinks({ params: { organizationId }, body: { linkIds, folderId } }), 'Could not move.')
  }

  addTags(organizationId: string, linkIds: string[], tags: string[]) {
    return this.call(() => this.client.links.addLinkTags({ params: { organizationId }, body: { linkIds, tags } }), 'Could not add tags.')
  }

  createFolder(organizationId: string, name: string, parentId: string | null) {
    return this.call(
      async () => FolderMapper.toUi(await this.client.folders.createFolder({ params: { organizationId }, body: { name, parentId } })),
      'Could not create the folder.',
    )
  }

  updateFolder(organizationId: string, folderId: string, changes: { name?: string; parentId?: string | null }) {
    return this.call(() => this.client.folders.updateFolder({ params: { organizationId, folderId }, body: changes }), 'Could not update the folder.')
  }

  deleteFolder(organizationId: string, folderId: string, mode: DeleteFolderMode) {
    return this.call(() => this.client.folders.deleteFolder({ params: { organizationId, folderId }, query: { mode } }), 'Could not delete the folder.')
  }

  private async call<T>(run: () => Promise<T>, fallback: string): Promise<T> {
    try {
      return await run()
    } catch (error) {
      throw ApiError.from(error, fallback)
    }
  }
}
