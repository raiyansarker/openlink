import { useEffect, useMemo, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Tokenizer } from '@astryxdesign/core/Tokenizer'
import { createStaticSource } from '@astryxdesign/core/Typeahead'
import { FOLDER_DIALOG_PADDING } from '#/components/links/dialog-spacing'

type AddTagsDialogProps = {
  /** Number of links the tags go on; 0 closes the dialog. */
  count: number
  existingTags: string[]
  onOpenChange: (open: boolean) => void
  onAdd: (tags: string[]) => void
}

/** Adds tags to several links at once (existing tags are kept). */
export default function AddTagsDialog({
  count,
  existingTags,
  onOpenChange,
  onAdd,
}: AddTagsDialogProps) {
  const [tags, setTags] = useState<string[]>([])
  useEffect(() => {
    if (count > 0) setTags([])
  }, [count])
  const source = useMemo(
    () => createStaticSource(existingTags.map((t) => ({ id: t, label: t }))),
    [existingTags],
  )

  return (
    <Dialog
      isOpen={count > 0}
      onOpenChange={onOpenChange}
      purpose="form"
      width={460}
      padding={FOLDER_DIALOG_PADDING}
    >
      <Layout
        header={
          <DialogHeader
            title="Add tags"
            subtitle={`To ${count} ${count === 1 ? 'link' : 'links'}`}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent padding={FOLDER_DIALOG_PADDING}>
            <Tokenizer
              label="Tags"
              description="Press Enter to add each tag. Links keep the tags they already have."
              placeholder="campaign, docs, social…"
              searchSource={source}
              value={tags.map((t) => ({ id: t, label: t }))}
              onChange={(items) =>
                setTags(
                  [...new Set(items.map((i) => i.label.trim().toLowerCase()))].filter(
                    Boolean,
                  ),
                )
              }
              hasCreate
              hasAutoFocus
              debounceMs={0}
              width="100%"
            />
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider padding={FOLDER_DIALOG_PADDING}>
            <HStack gap={2} hAlign="end" width="100%">
              <Button variant="ghost" label="Cancel" onClick={() => onOpenChange(false)} />
              <Button
                variant="primary"
                label="Add tags"
                isDisabled={tags.length === 0}
                onClick={() => {
                  onAdd(tags)
                  onOpenChange(false)
                }}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}
