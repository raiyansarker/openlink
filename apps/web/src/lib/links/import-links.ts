import type { LinkFolder, ShortLink } from '#/data/demo/types'
import {
  emptyDraft,
  isSlugTaken,
  validateDraft,
  type CreateLinkDraft,
} from '#/lib/links/create-link'
import { folderPathLabel } from '#/lib/links/folder-tree'

export const MAX_IMPORT_ROWS = 500
export const MAX_IMPORT_BYTES = 1024 * 1024

/** RFC 4180-ish CSV: quoted fields, escaped quotes, CRLF/LF, commas or semicolons. */
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, '')
  const firstLine = source.split(/\r?\n/, 1)[0] ?? ''
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0)
      ? ';'
      : ','
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]!
    if (quoted) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === delimiter) {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim()))
}

type Column = 'destination' | 'slug' | 'title' | 'tags' | 'folder' | 'notes'

const HEADER_ALIASES: Record<Column, string[]> = {
  destination: ['destination', 'url', 'destination url', 'target', 'targeturl', 'long url'],
  slug: ['slug', 'back-half', 'backhalf', 'short', 'key'],
  title: ['title', 'name'],
  tags: ['tags', 'tag'],
  folder: ['folder', 'folder path'],
  notes: ['notes', 'description'],
}

export type ImportRow = {
  /** 1-based line in the file (header is line 1). */
  line: number
  draft: CreateLinkDraft
  /** Folder name from the file that matched nothing (row goes to the default folder). */
  unknownFolder?: string
  error?: string
}

export type ImportPreview =
  | { ok: false; error: string }
  | { ok: true; rows: ImportRow[]; validCount: number }

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_]+/g, ' ')
}

/** Resolves "Docs / Guides", "Docs/Guides" or a unique folder name. */
function resolveFolder(folders: LinkFolder[], raw: string): string | null | undefined {
  const wanted = raw.trim().toLowerCase().replace(/\s*\/\s*/g, ' / ')
  if (!wanted) return null
  const byPath = folders.find(
    (f) => folderPathLabel(folders, f.id).toLowerCase() === wanted,
  )
  if (byPath) return byPath.id
  const byName = folders.filter((f) => f.name.toLowerCase() === wanted)
  return byName.length === 1 ? byName[0]!.id : undefined
}

/**
 * Turns a CSV file into validated drafts. Rows are checked against existing
 * links and earlier rows in the same file (back-halves must be unique).
 */
export function previewImport(
  text: string,
  {
    links,
    folders,
    defaultFolderId,
  }: { links: ShortLink[]; folders: LinkFolder[]; defaultFolderId: string | null },
): ImportPreview {
  const table = parseCsv(text)
  if (table.length < 2) {
    return { ok: false, error: 'The file needs a header row and at least one link.' }
  }
  const header = table[0]!.map(normalizeHeader)
  const index = {} as Record<Column, number>
  for (const column of Object.keys(HEADER_ALIASES) as Column[]) {
    index[column] = header.findIndex((h) => HEADER_ALIASES[column].includes(h))
  }
  if (index.destination < 0) {
    return { ok: false, error: 'Add a “destination” (or “url”) column.' }
  }
  const body = table.slice(1)
  if (body.length > MAX_IMPORT_ROWS) {
    return { ok: false, error: `Import up to ${MAX_IMPORT_ROWS} links at a time.` }
  }

  const accepted: ShortLink[] = []
  const rows: ImportRow[] = body.map((cells, i) => {
    const cell = (column: Column) =>
      index[column] >= 0 ? (cells[index[column]] ?? '').trim() : ''
    const folderRaw = cell('folder')
    const resolved = resolveFolder(folders, folderRaw)
    const draft: CreateLinkDraft = {
      ...emptyDraft(resolved === undefined ? defaultFolderId : resolved),
      destination: cell('destination'),
      slug: cell('slug'),
      title: cell('title'),
      description: cell('notes'),
      tags: [
        ...new Set(
          cell('tags')
            .split(/[|;,]/)
            .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
            .filter(Boolean),
        ),
      ],
    }
    const errors = validateDraft(draft, { links })
    let error = Object.values(errors)[0]
    if (!error && draft.slug && isSlugTaken(accepted, null, draft.slug)) {
      error = 'Back-half appears twice in this file.'
    }
    if (!error && draft.slug) {
      accepted.push({ slug: draft.slug, domainId: null } as ShortLink)
    }
    return {
      line: i + 2,
      draft,
      ...(resolved === undefined && folderRaw ? { unknownFolder: folderRaw } : {}),
      ...(error ? { error } : {}),
    }
  })
  return { ok: true, rows, validCount: rows.filter((r) => !r.error).length }
}

export const IMPORT_TEMPLATE =
  'destination,slug,title,tags,folder\nhttps://example.com/spring,spring,Spring launch,campaign|social,Docs\n'
