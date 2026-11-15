/** Folder tree rules, enforced server-side regardless of what the client checked. */
export const MAX_FOLDER_DEPTH = 10
export const MAX_FOLDER_NAME_LENGTH = 120

export type FolderNode = { id: string; parentId: string | null; name: string }

/** Root → … → folder (inclusive). Empty when the folder is unknown. */
export function folderPath(folders: FolderNode[], folderId: string | null): FolderNode[] {
  const byId = new Map(folders.map((f) => [f.id, f]))
  const path: FolderNode[] = []
  const seen = new Set<string>()
  let current = folderId ? byId.get(folderId) : undefined
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    path.unshift(current)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return path
}

/** Every folder nested below `folderId`, excluding itself. */
export function descendantIds(folders: FolderNode[], folderId: string): Set<string> {
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

/** Height of the subtree rooted at `folderId`; a leaf has height 1. */
function subtreeHeight(folders: FolderNode[], folderId: string, seen = new Set<string>()): number {
  if (seen.has(folderId)) return 0
  seen.add(folderId)
  let max = 1
  for (const f of folders) {
    if (f.parentId === folderId) max = Math.max(max, 1 + subtreeHeight(folders, f.id, seen))
  }
  return max
}

/** Normalise a folder name, or explain why it is invalid. */
export function normalizeFolderName(name: string): { ok: true; name: string } | { ok: false; message: string } {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, message: 'Enter a folder name.' }
  if (trimmed.length > MAX_FOLDER_NAME_LENGTH) {
    return { ok: false, message: `Use ${MAX_FOLDER_NAME_LENGTH} characters or fewer.` }
  }
  if (trimmed.includes('/')) return { ok: false, message: 'Folder names cannot contain “/”.' }
  return { ok: true, name: trimmed }
}

export function hasNameClash(
  folders: FolderNode[],
  name: string,
  parentId: string | null,
  ignoreFolderId?: string,
) {
  const lower = name.toLowerCase()
  return folders.some(
    (f) => f.id !== ignoreFolderId && f.parentId === parentId && f.name.toLowerCase() === lower,
  )
}

export function canCreateFolderIn(folders: FolderNode[], parentId: string | null) {
  return folderPath(folders, parentId).length < MAX_FOLDER_DEPTH
}

/** Whether `folderId` can sit under `targetParentId` (null = root) without a cycle or exceeding the depth cap. */
export function canMoveFolder(folders: FolderNode[], folderId: string, targetParentId: string | null) {
  if (targetParentId === folderId) return false
  if (targetParentId && descendantIds(folders, folderId).has(targetParentId)) return false
  return folderPath(folders, targetParentId).length + subtreeHeight(folders, folderId) <= MAX_FOLDER_DEPTH
}

/** Name for a re-parented folder that avoids clashing with its new siblings: "Name (2)", "Name (3)", … */
export function uniqueSiblingName(taken: Set<string>, name: string) {
  let candidate = name
  for (let n = 2; taken.has(candidate.toLowerCase()); n += 1) candidate = `${name} (${n})`
  return candidate
}
