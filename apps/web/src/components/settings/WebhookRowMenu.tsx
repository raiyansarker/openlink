import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { IconButton } from '@astryxdesign/core/IconButton'
import { MoreHorizontalIcon } from '#/components/icons/IcnMcp'
import type { WorkspaceWebhook } from '#/data/demo/webhooks'

type WebhookRowMenuProps = {
  webhook: WorkspaceWebhook
  onOpen: (id: string) => void
  onToggleEnabled: (id: string, enabled: boolean) => void
  onRemove: (id: string) => void
}

export default function WebhookRowMenu({
  webhook,
  onOpen,
  onToggleEnabled,
  onRemove,
}: WebhookRowMenuProps) {
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)

  const items = [
    {
      id: 'details',
      label: 'View details',
      onClick: () => onOpen(webhook.id),
    },
    {
      id: 'toggle',
      label: webhook.isEnabled ? 'Disable' : 'Enable',
      onClick: () => onToggleEnabled(webhook.id, !webhook.isEnabled),
    },
    { type: 'divider' as const },
    {
      id: 'delete',
      label: 'Delete endpoint',
      variant: 'destructive' as const,
      onClick: () => setDeleteAlertOpen(true),
    },
  ]

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
