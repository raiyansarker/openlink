import { Stack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'

type DashboardPageHeaderProps = {
  title: string
  subtitle?: string
}

export default function DashboardPageHeader({
  title,
  subtitle,
}: DashboardPageHeaderProps) {
  return (
    <Stack gap={0.5}>
      <Text type="display-2">{title}</Text>
      {subtitle ? (
        <Text type="supporting" color="secondary">
          {subtitle}
        </Text>
      ) : null}
    </Stack>
  )
}
