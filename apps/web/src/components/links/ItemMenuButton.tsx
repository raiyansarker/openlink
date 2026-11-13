import { DropdownMenu, type DropdownMenuOption } from '@astryxdesign/core/DropdownMenu'
import { IconButton } from '@astryxdesign/core/IconButton'
import { MoreHorizontalIcon } from '#/components/icons/IcnMcp'

export default function ItemMenuButton({
  label,
  items,
}: {
  label: string
  items: DropdownMenuOption[]
}) {
  return (
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
          label={`More actions for ${label}`}
          tooltip={`Actions for ${label}`}
          icon={<MoreHorizontalIcon size={16} />}
        />
      )}
      items={items}
    />
  )
}
