import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Avatar } from '@astryxdesign/core/Avatar'
import { Button } from '@astryxdesign/core/Button'
import { ClickableCard } from '@astryxdesign/core/ClickableCard'
import { HStack } from '@astryxdesign/core/HStack'
import { PlusIcon } from '#/components/icons/IcnMcp'
import { Text } from '@astryxdesign/core/Text'
import { TextArea } from '@astryxdesign/core/TextArea'
import { VStack } from '@astryxdesign/core/VStack'
import { MAX_LINK_NOTES_LENGTH } from '@openlink/contracts'
import { InlineShortcut } from '#/components/create-link/LinkPreviewPanel'
import type { LinkHistoryEntry } from '#/lib/api/types'

/** Who last changed the notes, and when (from the link's history). */
export type NotesEdit = { actor: string; at: string; imageUrl?: string }

type LinkNotesProps = {
  /** The saved notes; empty when there are none. */
  notes: string
  lastEdit?: NotesEdit
  /** Rejects with an Error carrying a message to show. */
  onSave: (notes: string) => Promise<void>
}

const AVATAR_PX = 32

/** The newest history entry that changed the notes, if any. */
export function lastNotesEdit(events: LinkHistoryEntry[]): NotesEdit | undefined {
  const event = events.find((e) => e.changes?.some((c) => c.label === 'Notes'))
  return event
    ? { actor: event.actor.label, at: event.occurredAt, ...(event.actor.imageUrl ? { imageUrl: event.actor.imageUrl } : {}) }
    : undefined
}

function timeAgo(iso: string, now = Date.now()): string {
  const diffMin = Math.round((now - new Date(iso).getTime()) / 60_000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.round(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffHours < 48) return 'Yesterday'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function exactTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

/** The notes as text, like a comment. Clicking anywhere on it starts editing. */
function NotesView({ notes, lastEdit, onEdit }: { notes: string; lastEdit?: NotesEdit; onEdit: () => void }) {
  if (!notes) {
    return (
      <ClickableCard label="Add notes" variant="muted" padding={4} width="100%" onClick={onEdit}>
        <HStack gap={3} vAlign="center" width="100%">
          <PlusIcon size={16} />
          <VStack gap={0.5} hAlign="start">
            <Text weight="medium">Add notes</Text>
            <Text type="supporting" color="secondary">
              What this link is for, where it’s shared, who owns it, when it can be retired.
            </Text>
          </VStack>
        </HStack>
      </ClickableCard>
    )
  }

  return (
    <ClickableCard label="Edit notes" variant="transparent" padding={3} width="100%" onClick={onEdit}>
      <HStack gap={3} vAlign="start" width="100%">
        {lastEdit ? <Avatar src={lastEdit.imageUrl} name={lastEdit.actor} size={AVATAR_PX} tooltip={false} /> : null}
        <VStack gap={1} hAlign="stretch" style={{ flex: 1, minWidth: 0 }}>
          <HStack gap={2} hAlign="between" vAlign="center" width="100%" style={{ minHeight: AVATAR_PX }}>
            <HStack gap={2} vAlign="center" wrap="wrap" style={{ minWidth: 0 }}>
              {lastEdit ? (
                <>
                  <Text weight="semibold">{lastEdit.actor}</Text>
                  <Text type="supporting" color="secondary">
                    <time dateTime={lastEdit.at} title={exactTime(lastEdit.at)}>
                      {timeAgo(lastEdit.at)}
                    </time>
                  </Text>
                </>
              ) : (
                <Text weight="semibold">Notes</Text>
              )}
            </HStack>
            <Text type="supporting" color="secondary">
              Click to edit
            </Text>
          </HStack>
          <Text style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>{notes}</Text>
        </VStack>
      </HStack>
    </ClickableCard>
  )
}

/** The editor, shown only while editing. */
function NotesEditor({
  notes,
  onSave,
  onClose,
}: {
  notes: string
  onSave: (notes: string) => Promise<void>
  onClose: () => void
}) {
  const [draft, setDraft] = useState(notes)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isDirty = draft.trim() !== notes.trim()
  const tooLong = draft.length > MAX_LINK_NOTES_LENGTH

  const save = async (event?: FormEvent) => {
    event?.preventDefault()
    if (tooLong || isSaving) return
    if (!isDirty) return onClose()
    setIsSaving(true)
    setError(null)
    try {
      await onSave(draft)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the notes.')
      setIsSaving(false)
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      void save()
    } else if (event.key === 'Escape') {
      // Keep page-level Escape handlers out of it.
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
  }

  return (
    <VStack
      as="form"
      gap={2}
      hAlign="stretch"
      width="100%"
      onSubmit={(event) => void save(event)}
      onKeyDown={onKeyDown}
    >
      <TextArea
        label="Notes"
        isLabelHidden
        placeholder="What this link is for, where it’s shared, who owns it, when it can be retired…"
        value={draft}
        onChange={(value) => {
          setDraft(value)
          if (error) setError(null)
        }}
        rows={5}
        hasAutoFocus
        maxLength={draft.length > MAX_LINK_NOTES_LENGTH * 0.8 ? MAX_LINK_NOTES_LENGTH : undefined}
        status={
          error
            ? { type: 'error', message: error }
            : tooLong
              ? { type: 'error', message: `Keep notes under ${MAX_LINK_NOTES_LENGTH.toLocaleString()} characters.` }
              : undefined
        }
      />
      <HStack gap={2} hAlign="end" vAlign="center" width="100%">
        <Text type="supporting" color="secondary">
          Esc to cancel
        </Text>
        <Button variant="ghost" size="sm" label="Cancel" onClick={onClose} isDisabled={isSaving} />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          label="Save"
          aria-keyshortcuts="Meta+Enter Control+Enter"
          endContent={<InlineShortcut />}
          isLoading={isSaving}
          isDisabled={tooLong}
        />
      </HStack>
    </VStack>
  )
}

/**
 * Team notes on a link: why it exists, where it's shared, when it can go.
 * Read like a comment; click it to edit. Changes show up in History.
 */
export default function LinkNotes({ notes, lastEdit, onSave }: LinkNotesProps) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <VStack gap={3} hAlign="stretch" width="100%" style={{ maxWidth: 760 }}>
      <VStack gap={0.5} hAlign="start">
        <Text weight="semibold">Notes</Text>
        <Text type="supporting" color="secondary">
          Only your team sees these. They never change where the link goes.
        </Text>
      </VStack>

      {isEditing ? (
        <NotesEditor notes={notes} onSave={onSave} onClose={() => setIsEditing(false)} />
      ) : (
        <NotesView notes={notes} lastEdit={lastEdit} onEdit={() => setIsEditing(true)} />
      )}
    </VStack>
  )
}
