import { useState } from 'react'
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { IconButton } from '@astryxdesign/core/IconButton'
import { MoreHorizontalIcon } from '#/components/icons/IcnMcp'
import type { Domain } from '#/lib/api/types'
import RemoveDomainDialog from './RemoveDomainDialog'

type DomainRowMenuProps = {
  domain: Domain
  onOpen: (domain: Domain) => void
  onVerify: (domainId: string) => void
  /** Rejects with a message the dialog shows. */
  onRemove: (domainId: string) => Promise<void>
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
      <RemoveDomainDialog
        isOpen={removeAlertOpen}
        onOpenChange={setRemoveAlertOpen}
        domain={domain}
        onRemove={() => onRemove(domain.id)}
      />
    </>
  )
}
