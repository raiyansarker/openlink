import type { LinkFolder, ShortLink } from '#/data/demo/types'

/** Keeps recursion and pickers bounded. Root-level folders have depth 1. */
export const MAX_FOLDER_DEPTH = 10
export const MAX_FOLDER_NAME_LENGTH = 120

export type DeleteFolderMode = 'move-up' | 'cascade'

function byName<T extends { name: string }>(a: T, b: T) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
}

export function getChildFolders(
  folders: LinkFolder[],
  parentId: string | null,
): LinkFolder[] {
  return folders.filter((f) => f.parentId === parentId).sort(byName)
}

export function getLinksInFolder(
  links: ShortLink[],
  folderId: string | null,
): ShortLink[] {
  return links.filter((l) => (l.folderId ?? null) === folderId)
}

/** Root → … → folder (inclusive). Empty when the folder is unknown. */
export function getFolderPath(
  folders: LinkFolder[],
  folderId: string | null,
): LinkFolder[] {
  const byId = new Map(folders.map((f) => [f.id, f]))
  const path: LinkFolder[] = []
  const seen = new Set<string>()
  let current = folderId ? byId.get(folderId) : undefined
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    path.unshift(current)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return path
}

/** All descendant folder ids (excluding the folder itself). */
export function getDescendantFolderIds(
  folders: LinkFolder[],
  folderId: string,
): Set<string> {
  const result = new Set<string>()
  const queue = [folderId]
  while (queue.length > 0) {
    const id = queue.pop()!
    for (const f of folders) {
      if (f.parentId === id && !result.has(f.id)) {
        result.add(f.id)
        queue.push(f.id)
      }
    }
  }
  return result
}

/** Height of the subtree rooted at `folderId` (a leaf folder has height 1). */
function subtreeHeight(folders: LinkFolder[], folderId: string): number {
  let max = 1
  for (const f of folders) {
    if (f.parentId === folderId) {
      max = Math.max(max, 1 + subtreeHeight(folders, f.id))
    }
  }
  return max
}

/** Whether `folderId` can be moved under `targetParentId` (null = root). */
export function canMoveFolder(
  folders: LinkFolder[],
  folderId: string,
  targetParentId: string | null,
): boolean {
  if (targetParentId === folderId) return false
  if (
    targetParentId &&
    getDescendantFolderIds(folders, folderId).has(targetParentId)
  ) {
    return false
  }
  const targetDepth = getFolderPath(folders, targetParentId).length
  return targetDepth + subtreeHeight(folders, folderId) <= MAX_FOLDER_DEPTH
}

export function canCreateFolderIn(
  folders: LinkFolder[],
  parentId: string | null,
): boolean {
  return getFolderPath(folders, parentId).length < MAX_FOLDER_DEPTH
}

/** Returns an error message, or null when the name is valid among siblings. */
export function validateFolderName(
  folders: LinkFolder[],
  name: string,
  parentId: string | null,
  ignoreFolderId?: string,
): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Enter a folder name.'
  if (trimmed.length > MAX_FOLDER_NAME_LENGTH) {
    return `Use ${MAX_FOLDER_NAME_LENGTH} characters or fewer.`
  }
  if (trimmed.includes('/')) return 'Folder names cannot contain “/”.'
  const clash = folders.some(
    (f) =>
      f.id !== ignoreFolderId &&
      f.parentId === parentId &&
      f.name.toLowerCase() === trimmed.toLowerCase(),
  )
  return clash ? 'A folder with this name already exists here.' : null
}

export function folderPathLabel(
  folders: LinkFolder[],
  folderId: string | null,
): string {
  const names = getFolderPath(folders, folderId).map((f) => f.name)
  return names.length === 0 ? 'All links' : names.join(' / ')
}

/** Link + folder counts for everything nested below a folder. */
export function countFolderContents(
  folders: LinkFolder[],
  links: ShortLink[],
  folderId: string,
): { folders: number; links: number } {
  const ids = getDescendantFolderIds(folders, folderId)
  ids.add(folderId)
  return {
    folders: ids.size - 1,
    links: links.filter((l) => l.folderId && ids.has(l.folderId)).length,
  }
}

/**
 * Deletes a folder. `move-up` re-parents child folders and links to the
 * deleted folder's parent; `cascade` removes the whole subtree and its links.
 */
export function deleteFolderFromTree(
  folders: LinkFolder[],
  links: ShortLink[],
  folderId: string,
  mode: DeleteFolderMode,
): { folders: LinkFolder[]; links: ShortLink[] } {
  const target = folders.find((f) => f.id === folderId)
  if (!target) return { folders, links }

  if (mode === 'move-up') {
    const remaining = folders.filter((f) => f.id !== folderId)
    const taken = new Set(
      remaining
        .filter((f) => f.parentId === target.parentId)
        .map((f) => f.name.toLowerCase()),
    )
    // Re-parented children may clash with existing siblings: suffix " (n)".
    const renamed = new Map<string, string>()
    for (const child of remaining.filter((f) => f.parentId === folderId)) {
      let name = child.name
      for (let n = 2; taken.has(name.toLowerCase()); n++) {
        name = `${child.name} (${n})`
      }
      taken.add(name.toLowerCase())
      renamed.set(child.id, name)
    }
    return {
      folders: remaining.map((f) =>
        f.parentId === folderId
          ? { ...f, parentId: target.parentId, name: renamed.get(f.id)! }
          : f,
      ),
      links: links.map((l) =>
        l.folderId === folderId ? { ...l, folderId: target.parentId } : l,
      ),
    }
  }

  const doomed = getDescendantFolderIds(folders, folderId)
  doomed.add(folderId)
  return {
    folders: folders.filter((f) => !doomed.has(f.id)),
    links: links.filter((l) => !(l.folderId && doomed.has(l.folderId))),
  }
}
