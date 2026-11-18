import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { IconButton } from '@astryxdesign/core/IconButton'
import { MoreHorizontalIcon } from '#/components/icons/IcnMcp'
import type { WorkspaceApiKey } from '#/data/demo/api-keys'
import type { Role } from '#/lib/api/types'
import ChangeApiKeyRoleDialog from '#/components/settings/ChangeApiKeyRoleDialog'

type ApiKeyRowMenuProps = {
  apiKey: WorkspaceApiKey
  onChangeRole: (keyId: string, role: Role) => void
  /** Replaces the key. The new secret is shown by the parent, since this row goes away with the old key. */
  onRotate: (keyId: string) => void
  onRevoke: (keyId: string) => void
}

export default function ApiKeyRowMenu({
  apiKey,
  onChangeRole,
  onRotate,
  onRevoke,
}: ApiKeyRowMenuProps) {
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [revokeAlertOpen, setRevokeAlertOpen] = useState(false)
  const [rotateAlertOpen, setRotateAlertOpen] = useState(false)

  const items = [
    {
      id: 'change-role',
      label: 'Change role',
      onClick: () => setRoleDialogOpen(true),
    },
    {
      id: 'rotate',
      label: 'Rotate key',
      onClick: () => setRotateAlertOpen(true),
    },
    { type: 'divider' as const },
    {
      id: 'revoke',
      label: 'Revoke key',
      variant: 'destructive' as const,
      onClick: () => setRevokeAlertOpen(true),
    },
  ]

  const confirmRotate = () => {
    setRotateAlertOpen(false)
    onRotate(apiKey.id)
  }

  const confirmRevoke = () => {
    onRevoke(apiKey.id)
    setRevokeAlertOpen(false)
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
            label={`More actions for ${apiKey.name}`}
            tooltip={`Actions for ${apiKey.name}`}
          />
        )}
        items={items}
      />
      <ChangeApiKeyRoleDialog
        apiKey={apiKey}
        isOpen={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        onConfirm={onChangeRole}
      />
      <AlertDialog
        isOpen={rotateAlertOpen}
        onOpenChange={setRotateAlertOpen}
        title={`Rotate ${apiKey.name}?`}
        description="The current secret stops working immediately. Update every integration with the new key after you rotate."
        actionLabel="Rotate key"
        actionVariant="destructive"
        onAction={confirmRotate}
      />
      <AlertDialog
        isOpen={revokeAlertOpen}
        onOpenChange={setRevokeAlertOpen}
        title={`Revoke ${apiKey.name}?`}
        description="This API key will stop working immediately. Anything still using it will fail until you create or rotate a replacement."
        actionLabel="Revoke key"
        onAction={confirmRevoke}
      />
    </>
  )
}
