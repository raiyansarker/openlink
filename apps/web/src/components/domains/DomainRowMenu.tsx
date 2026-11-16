import { useState } from 'react'
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { IconButton } from '@astryxdesign/core/IconButton'
import { MoreHorizontalIcon } from '#/components/icons/IcnMcp'
import type { WorkspaceCustomDomain } from '#/data/demo/domains'
import RemoveDomainDialog, { type LinkFate } from './RemoveDomainDialog'

type DomainRowMenuProps = {
  domain: WorkspaceCustomDomain
  onOpen: (domain: WorkspaceCustomDomain) => void
  onVerify: (domainId: string) => void
  /** The workspace's other domains, as places to move this one's links. */
  otherDomains: WorkspaceCustomDomain[]
  onRemove: (domainId: string, fate: LinkFate) => Promise<void>
}

export default function DomainRowMenu({
  domain,
  onOpen,
  onVerify,
  otherDomains,
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
        otherDomains={otherDomains}
        onRemove={(fate) => onRemove(domain.id, fate)}
      />
    </>
  )
}
