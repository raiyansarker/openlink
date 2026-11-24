import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { TreeList, type TreeListItemData } from '@astryxdesign/core/TreeList'
import { VStack } from '@astryxdesign/core/VStack'
import { useMemo, useState, type FormEvent } from 'react'

import { ChevronLeftIcon, FolderIcon, PlusIcon } from './icons'

export type Folder = { id: string; name: string; parentId?: string | null }

/** The workspace root; links there have no folder. */
export const ROOT = ''
const ROOT_NODE = '__root__'
/** Same ceiling as the dashboard (apps/web folder-tree); deeper asks for a name and gets a server error. */
const MAX_FOLDER_DEPTH = 10

export function folderPath(folders: Folder[], id: string): string {
  if (!id) return 'No folder'
  const byId = new Map(folders.map((f) => [f.id, f]))
  const names: string[] = []
  const seen = new Set<string>()
  for (let f = byId.get(id); f && !seen.has(f.id); f = f.parentId ? byId.get(f.parentId) : undefined) {
    seen.add(f.id)
    names.unshift(f.name)
  }
  return names.length ? names.join(' / ') : 'No folder'
}

/** Levels below the root; a top-level folder has depth 1. */
function folderDepth(folders: Folder[], id: string): number {
  if (!id) return 0
  const byId = new Map(folders.map((f) => [f.id, f]))
  let depth = 0
  const seen = new Set<string>()
  for (let f = byId.get(id); f && !seen.has(f.id); f = f.parentId ? byId.get(f.parentId) : undefined) {
    seen.add(f.id)
    depth++
  }
  return depth
}

type Props = {
  folders: Folder[]
  selected: string
  onSelect: (folderId: string) => void
  onBack: () => void
  /** Creates a folder inside `parentId` (ROOT for top level) and resolves with it. */
  onCreate: (name: string, parentId: string) => Promise<Folder>
}

/** A page with the workspace's folders as a tree: pick one, or make a new one inside the highlighted folder. */
export default function FolderPicker({ folders, selected, onSelect, onBack, onCreate }: Props) {
  const [picked, setPicked] = useState(selected)
  const [draft, setDraft] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const items = useMemo<TreeListItemData[]>(() => {
    const byId = new Map(folders.map((f) => [f.id, f]))
    // Open every folder on the way to the highlighted one.
    const open = new Set<string>([ROOT_NODE])
    for (let f = byId.get(picked); f?.parentId; f = byId.get(f.parentId)) open.add(f.parentId)

    const childrenOf = (parentId: string | null): TreeListItemData[] =>
      folders
        .filter((f) => (f.parentId ?? null) === parentId)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((f) => {
          const children = childrenOf(f.id)
          return {
            id: f.id,
            label: f.name,
            startContent: <Icon icon={FolderIcon} size="sm" color="secondary" />,
            isSelected: picked === f.id,
            onClick: () => setPicked(f.id),
            ...(children.length ? { children, isExpanded: open.has(f.id) } : {}),
          }
        })

    return [
      {
        id: ROOT_NODE,
        label: 'All links',
        description: 'No folder',
        startContent: <Icon icon={FolderIcon} size="sm" color="secondary" />,
        isSelected: picked === ROOT,
        onClick: () => setPicked(ROOT),
        children: childrenOf(null),
        isExpanded: true,
      },
    ]
  }, [folders, picked])

  async function create(event: FormEvent) {
    event.preventDefault()
    if (!draft?.trim()) return
    setBusy(true)
    setError(null)
    try {
      const folder = await onCreate(draft.trim(), picked)
      setPicked(folder.id)
      setDraft(null)
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Could not create the folder.')
    } finally {
      setBusy(false)
    }
  }

  const pickedName = picked ? folderPath(folders, picked).split(' / ').pop() : 'All links'
  const canCreateHere = folderDepth(folders, picked) < MAX_FOLDER_DEPTH

  return (
    <VStack gap={4} hAlign="stretch" width="100%">
      <HStack gap={2} vAlign="center">
        <IconButton variant="ghost" size="sm" icon={<Icon icon={ChevronLeftIcon} />} label="Back" onClick={onBack} />
        <Text weight="semibold">Choose a folder</Text>
      </HStack>

      <TreeList items={items} variant="noGuides" />

      {draft === null ? (
        <Button
          variant="ghost"
          icon={<Icon icon={PlusIcon} />}
          label={`New folder in ${pickedName}`}
          {...(canCreateHere
            ? {}
            : {
                isDisabled: true,
                tooltip: 'Folders cannot be nested any deeper.',
              })}
          onClick={() => setDraft('')}
        />
      ) : (
        <form onSubmit={create}>
          <VStack gap={2} hAlign="stretch">
            <TextInput
              label={`New folder in ${pickedName}`}
              value={draft}
              onChange={setDraft}
              width="100%"
              hasAutoFocus
              {...(error ? { status: { type: 'error' as const, message: error } } : {})}
            />
            <HStack gap={2} hAlign="end">
              <Button label="Cancel" onClick={() => setDraft(null)} />
              <Button type="submit" variant="primary" label="Create" isLoading={busy} isDisabled={!draft.trim()} />
            </HStack>
          </VStack>
        </form>
      )}

      <Button variant="primary" size="lg" width="100%" label={`Use ${pickedName}`} onClick={() => onSelect(picked)} />
    </VStack>
  )
}
