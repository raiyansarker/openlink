import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { IconButton } from '@astryxdesign/core/IconButton'
import { MoreHorizontalIcon } from '#/components/icons/IcnMcp'
import type { WorkspaceApiKey } from '#/data/demo/api-keys'
import type { WorkspaceMemberRole } from '#/data/demo/types'
import {
  buildFullApiKeySecret,
  randomApiKeyPrefix,
} from '#/lib/api-keys/generate-api-key-secret'
import ApiKeySecretRevealDialog from '#/components/settings/ApiKeySecretRevealDialog'
import ChangeApiKeyRoleDialog from '#/components/settings/ChangeApiKeyRoleDialog'

type ApiKeyRowMenuProps = {
  apiKey: WorkspaceApiKey
  onChangeRole: (keyId: string, role: WorkspaceMemberRole) => void
  onRotate: (keyId: string, prefix: string) => void
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
  const [rotatedSecret, setRotatedSecret] = useState<string | null>(null)

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
    const prefix = randomApiKeyPrefix()
    const secret = buildFullApiKeySecret(prefix)
    onRotate(apiKey.id, prefix)
    setRotatedSecret(secret)
    setRotateAlertOpen(false)
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
      <ApiKeySecretRevealDialog
        isOpen={rotatedSecret != null}
        onOpenChange={(open) => {
          if (!open) setRotatedSecret(null)
        }}
        title="Save your new key"
        body="The previous secret no longer works. Copy the new key and update your integrations—you cannot view it again after you close this dialog."
        secret={rotatedSecret ?? ''}
      />
    </>
  )
}
