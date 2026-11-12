import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import ApiKeySecretField from '#/components/settings/ApiKeySecretField'

type ApiKeySecretRevealDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body: string
  secret: string
}

export default function ApiKeySecretRevealDialog({
  isOpen,
  onOpenChange,
  title,
  body,
  secret,
}: ApiKeySecretRevealDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose="required"
      width={440}
    >
      <Layout
        header={<DialogHeader title={title} onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <VStack gap={4} hAlign="stretch" width="100%">
              <Text color="secondary" type="supporting">
                {body}
              </Text>
              <ApiKeySecretField value={secret} />
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end" width="100%" wrap="wrap">
              <Button
                variant="primary"
                size="sm"
                label="Done"
                onClick={() => onOpenChange(false)}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}
