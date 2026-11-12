import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { IconButton } from '@astryxdesign/core/IconButton'
import { MoreHorizontalIcon } from '#/components/icons/IcnMcp'
import ApiKeySecretRevealDialog from '#/components/settings/ApiKeySecretRevealDialog'
import type { WorkspaceWebhook } from '#/data/demo/webhooks'
import {
  buildFullWebhookSecret,
  randomWebhookPrefix,
} from '#/lib/integrations/webhook-secret'

type WebhookRowMenuProps = {
  webhook: WorkspaceWebhook
  onOpen: (id: string) => void
  onToggleEnabled: (id: string, enabled: boolean) => void
  onRollSecret: (id: string, prefix: string) => void
  onRemove: (id: string) => void
}

export default function WebhookRowMenu({
  webhook,
  onOpen,
  onToggleEnabled,
  onRollSecret,
  onRemove,
}: WebhookRowMenuProps) {
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [rollAlertOpen, setRollAlertOpen] = useState(false)
  const [rolledSecret, setRolledSecret] = useState<string | null>(null)

  const items = [
    {
      id: 'details',
      label: 'View details',
      onClick: () => onOpen(webhook.id),
    },
    {
      id: 'toggle',
      label: webhook.isEnabled ? 'Pause deliveries' : 'Resume deliveries',
      onClick: () => onToggleEnabled(webhook.id, !webhook.isEnabled),
    },
    {
      id: 'roll',
      label: 'Roll signing secret',
      onClick: () => setRollAlertOpen(true),
    },
    { type: 'divider' as const },
    {
      id: 'delete',
      label: 'Delete endpoint',
      variant: 'destructive' as const,
      onClick: () => setDeleteAlertOpen(true),
    },
  ]

  const confirmRoll = () => {
    const prefix = randomWebhookPrefix()
    onRollSecret(webhook.id, prefix)
    setRolledSecret(buildFullWebhookSecret(prefix))
    setRollAlertOpen(false)
  }

  return (
    <>
      <DropdownMenu
        hasChevron={false}
        presentation="popover"
        placement="below"
        alignment="end"
        menuWidth={200}
        renderTrigger={(triggerProps) => (
          <IconButton
            {...triggerProps}
            variant="ghost"
            size="sm"
            icon={<MoreHorizontalIcon size={16} />}
            label={`More actions for ${webhook.name}`}
            tooltip={`Actions for ${webhook.name}`}
          />
        )}
        items={items}
      />
      <AlertDialog
        isOpen={rollAlertOpen}
        onOpenChange={setRollAlertOpen}
        title={`Roll secret for ${webhook.name}?`}
        description="The current secret stops working immediately. Requests your server receives will be signed with the new one."
        actionLabel="Roll secret"
        onAction={confirmRoll}
      />
      <ApiKeySecretRevealDialog
        isOpen={rolledSecret != null}
        onOpenChange={(open) => {
          if (!open) setRolledSecret(null)
        }}
        title="New signing secret"
        body="Copy it now and update your server. You will not see it again."
        secret={rolledSecret ?? ''}
        secretLabel="Signing secret"
      />
      <AlertDialog
        isOpen={deleteAlertOpen}
        onOpenChange={setDeleteAlertOpen}
        title={`Delete ${webhook.name}?`}
        description="Deliveries to this URL will stop immediately. You cannot undo this action."
        actionLabel="Delete endpoint"
        onAction={() => {
          onRemove(webhook.id)
          setDeleteAlertOpen(false)
        }}
      />
    </>
  )
}
