import { VStack } from '@astryxdesign/core/VStack'
import WorkspaceMembersPanel from '#/components/members/WorkspaceMembersPanel'

export default function DashboardMembersPanel() {
  return (
    <VStack
      gap={6}
      width="fill"
      paddingBlockStart={8}
      paddingInline={8}
      paddingBlockEnd={10}
    >
      <WorkspaceMembersPanel />
    </VStack>
  )
}
