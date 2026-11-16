import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { TextArea } from '@astryxdesign/core/TextArea'
import { VStack } from '@astryxdesign/core/VStack'
import { MAX_LINK_NOTES_LENGTH } from '@openlink/contracts'
import { InlineShortcut } from '#/components/create-link/LinkPreviewPanel'

type LinkNotesProps = {
  /** The saved notes; empty when there are none. */
  notes: string
  /** Rejects with an Error carrying a message to show. */
  onSave: (notes: string) => Promise<void>
}

/**
 * Team notes on a link: why it exists, where it's shared, when it can go.
 * One block of text, edited in place. Changes show up in History.
 */
export default function LinkNotes({ notes, onSave }: LinkNotesProps) {
  const [draft, setDraft] = useState(notes)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  // Follow saves made elsewhere (e.g. the edit form) while nothing is typed here.
  const [savedNotes, setSavedNotes] = useState(notes)
  if (notes !== savedNotes) {
    setSavedNotes(notes)
    if (draft === savedNotes) setDraft(notes)
  }

  useEffect(() => {
    if (!justSaved) return
    const timer = window.setTimeout(() => setJustSaved(false), 2000)
    return () => window.clearTimeout(timer)
  }, [justSaved])

  const isDirty = draft.trim() !== notes.trim()
  const tooLong = draft.length > MAX_LINK_NOTES_LENGTH

  const save = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!isDirty || tooLong || isSaving) return
    setIsSaving(true)
    setError(null)
    try {
      await onSave(draft)
      setJustSaved(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the notes.')
    } finally {
      setIsSaving(false)
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      void save()
    } else if (event.key === 'Escape' && isDirty) {
      event.preventDefault()
      event.stopPropagation()
      setDraft(notes)
      setError(null)
    }
  }

  return (
    <VStack
      as="form"
      gap={3}
      hAlign="stretch"
      width="100%"
      style={{ maxWidth: 760 }}
      onSubmit={(event) => void save(event)}
      onKeyDown={onKeyDown}
    >
      <VStack gap={0.5} hAlign="start">
        <Text weight="semibold">Notes</Text>
        <Text type="supporting" color="secondary">
          Only your team sees these. They never change where the link goes.
        </Text>
      </VStack>

      <TextArea
        label="Notes"
        isLabelHidden
        placeholder="What this link is for, where it’s posted, who owns it, when it can be retired…"
        value={draft}
        onChange={(value) => {
          setDraft(value)
          if (error) setError(null)
        }}
        rows={8}
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
        <Text type="supporting" color="secondary" aria-live="polite">
          {justSaved && !isDirty ? 'Saved' : isDirty ? 'Esc to discard' : ''}
        </Text>
        {isDirty ? (
          <Button
            variant="ghost"
            size="sm"
            label="Discard"
            onClick={() => {
              setDraft(notes)
              setError(null)
            }}
          />
        ) : null}
        <Button
          type="submit"
          variant="primary"
          size="sm"
          label="Save notes"
          aria-keyshortcuts="Meta+Enter Control+Enter"
          endContent={<InlineShortcut />}
          isLoading={isSaving}
          isDisabled={!isDirty || tooLong}
        />
      </HStack>
    </VStack>
  )
}
