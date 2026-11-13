import type { LinkFolder } from './types'

export const demoFolders: LinkFolder[] = [
  {
    id: 'fld_gh_docs',
    orgId: 'org_github',
    parentId: null,
    name: 'Docs',
    createdAt: '2026-03-10T08:00:00Z',
  },
  {
    id: 'fld_gh_guides',
    orgId: 'org_github',
    parentId: 'fld_gh_docs',
    name: 'Guides',
    createdAt: '2026-03-12T08:00:00Z',
  },
  {
    id: 'fld_gh_product',
    orgId: 'org_github',
    parentId: null,
    name: 'Product',
    createdAt: '2026-06-01T08:00:00Z',
  },
]

/** link id → folder id (links not listed live at the org root). */
export const demoFolderAssignments: Record<string, string> = {}
