import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { GlobeIcon } from '#/components/icons/IcnMcp'
import { SHELL_NAV_ICON_COLOR } from '#/components/dashboard/layout/dashboard-shell-colors'

type DomainNameCellProps = {
  hostname: string
}

/** Globe icon + single-line hostname (row click opens the sheet). */
export default function DomainNameCell({ hostname }: DomainNameCellProps) {
  return (
    <HStack gap={3} vAlign="center" width="100%">
      <span
        style={{
          display: 'flex',
          flexShrink: 0,
          color: SHELL_NAV_ICON_COLOR,
        }}
      >
        <GlobeIcon size={16} strokeWidth={1.2} />
      </span>
      <Text weight="semibold" maxLines={1}>
        {hostname}
      </Text>
    </HStack>
  )
}
