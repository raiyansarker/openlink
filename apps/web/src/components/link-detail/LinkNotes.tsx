import { useState, type KeyboardEvent } from 'react'
import { useForm } from '@tanstack/react-form'
import { type } from 'arktype'
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
import type { NotesEdit } from '#/lib/links/history'
import { fieldStatus, submitWith } from '#/lib/forms/fields'

const NotesField = type('string').narrow(
  (value, ctx) =>
    value.length <= MAX_LINK_NOTES_LENGTH ||
    ctx.reject({ message: `Keep notes under ${MAX_LINK_NOTES_LENGTH.toLocaleString()} characters.` }),
)

type LinkNotesProps = {
  /** The saved notes; empty when there are none. */
  notes: string
  lastEdit?: NotesEdit
  /** Rejects with an Error carrying a message to show. */
  onSave: (notes: string) => Promise<void>
  /** Read-only for roles that cannot save notes (viewers): no editing affordances. */
  isReadOnly?: boolean
}

const AVATAR_PX = 32

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
function NotesView({
  notes,
  lastEdit,
  onEdit,
  isReadOnly,
}: {
  notes: string
  lastEdit?: NotesEdit
  onEdit: () => void
  isReadOnly: boolean
}) {
  // Viewers read notes but cannot add or change them: plain, non-interactive text.
  if (isReadOnly) {
    if (!notes) {
      return <Text type="supporting" color="secondary">No notes yet.</Text>
    }
    return (
      <VStack gap={2} hAlign="stretch" width="100%">
        {lastEdit ? (
          <HStack gap={2} vAlign="center" wrap="wrap">
            <Avatar src={lastEdit.imageUrl} name={lastEdit.actor} size={AVATAR_PX} tooltip={false} />
            <VStack gap={0} hAlign="start">
              <Text weight="semibold">{lastEdit.actor}</Text>
              <Text type="supporting" color="secondary">
                <time dateTime={lastEdit.at} title={exactTime(lastEdit.at)}>
                  {timeAgo(lastEdit.at)}
                </time>
              </Text>
            </VStack>
          </HStack>
        ) : (
          <Text weight="semibold">Notes</Text>
        )}
        <Text style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>{notes}</Text>
      </VStack>
    )
  }
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
  const form = useForm({
    defaultValues: { notes },
    validators: {
      onSubmitAsync: async ({ value }) => {
        // Nothing changed: just close.
        if (value.notes.trim() === notes.trim()) return undefined
        try {
          await onSave(value.notes)
          return undefined
        } catch (caught) {
          return { fields: { notes: caught instanceof Error ? caught.message : 'Could not save the notes.' } }
        }
      },
    },
    onSubmit: onClose,
  })

  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      void form.handleSubmit()
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
      onSubmit={submitWith(form)}
      onKeyDown={onKeyDown}
    >
      {/* Length is checked as you type, so the limit shows before saving. */}
      <form.Field name="notes" validators={{ onChange: NotesField }}>
        {(field) => (
          <TextArea
            label="Notes"
            isLabelHidden
            placeholder="What this link is for, where it’s shared, who owns it, when it can be retired…"
            value={field.state.value}
            onChange={field.handleChange}
            rows={5}
            hasAutoFocus
            maxLength={field.state.value.length > MAX_LINK_NOTES_LENGTH * 0.8 ? MAX_LINK_NOTES_LENGTH : undefined}
            status={fieldStatus(field.state.meta.errors)}
          />
        )}
      </form.Field>
      <HStack gap={2} hAlign="end" vAlign="center" width="100%">
        <Text type="supporting" color="secondary">
          Esc to cancel
        </Text>
        <form.Subscribe selector={(state) => [state.isSubmitting, state.values.notes.length > MAX_LINK_NOTES_LENGTH] as const}>
          {([isSaving, tooLong]) => (
            <>
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
            </>
          )}
        </form.Subscribe>
      </HStack>
    </VStack>
  )
}

/**
 * Team notes on a link: why it exists, where it's shared, when it can go.
 * Read like a comment; click it to edit. Changes show up in History.
 */
export default function LinkNotes({ notes, lastEdit, onSave, isReadOnly = false }: LinkNotesProps) {
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
        <NotesView notes={notes} lastEdit={lastEdit} onEdit={() => setIsEditing(true)} isReadOnly={isReadOnly} />
      )}
    </VStack>
  )
}
