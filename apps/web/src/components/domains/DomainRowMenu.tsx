import { useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { IconButton } from '@astryxdesign/core/IconButton'
import { MoreHorizontalIcon } from '#/components/icons/IcnMcp'
import type { WorkspaceCustomDomain } from '#/data/demo/domains'

type DomainRowMenuProps = {
  domain: WorkspaceCustomDomain
  onOpen: (domain: WorkspaceCustomDomain) => void
  onVerify: (domainId: string) => void
  onRemove: (domainId: string) => void
}

export default function DomainRowMenu({
  domain,
  onOpen,
  onVerify,
  onRemove,
}: DomainRowMenuProps) {
  const [removeAlertOpen, setRemoveAlertOpen] = useState(false)

  const needsDns =
    domain.readiness === 'pending' ||
    domain.readiness === 'verifying' ||
    domain.readiness === 'failed'

  const items = [
    {
      id: 'details',
      label: 'View details',
      onClick: () => onOpen(domain),
    },
    ...(needsDns
      ? [
          {
            id: 'verify',
            label: 'Verify DNS',
            onClick: () => onVerify(domain.id),
          },
        ]
      : []),
    { type: 'divider' as const },
    {
      id: 'remove',
      label: 'Remove domain',
      variant: 'destructive' as const,
      onClick: () => setRemoveAlertOpen(true),
    },
  ]

  const confirmRemove = () => {
    onRemove(domain.id)
    setRemoveAlertOpen(false)
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
            label={`More actions for ${domain.hostname}`}
            tooltip={`Actions for ${domain.hostname}`}
            icon={<MoreHorizontalIcon size={16} />}
          />
        )}
        items={items}
      />
      <AlertDialog
        isOpen={removeAlertOpen}
        onOpenChange={setRemoveAlertOpen}
        title={`Remove ${domain.hostname}?`}
        description="Short links on this host stop working immediately. This cannot be undone."
        actionLabel="Remove domain"
        onAction={confirmRemove}
      />
    </>
  )
}
