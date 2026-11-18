import { useState } from 'react'
import { Divider } from '@astryxdesign/core/Divider'
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer'
import { Layout, LayoutContent } from '@astryxdesign/core/Layout'
import { VStack } from '@astryxdesign/core/VStack'
import ActivityDetailSheet from '#/components/activity/ActivityDetailSheet'
import type { ActivityEvent, Role } from '#/lib/api/types'
import type { Person } from '#/lib/members/people'
import { MemberActivitySection, MemberProfile } from './MemberDetailSections'
import {
  FLOATING_END_DRAWER_PADDING,
  floatingEndDrawerStyle,
} from './floating-end-drawer'

type MemberDetailDrawerProps = {
  member: Person | null
  onOpenChange: (open: boolean) => void
  onChangeRole: (member: Person, role: Role) => void
  onRemove: (member: Person) => void
  onResendInvite: (member: Person) => void
}

export default function MemberDetailDrawer({
  member: current,
  onOpenChange,
  onChangeRole,
  onRemove,
  onResendInvite,
}: MemberDetailDrawerProps) {
  // Keep the last member (and their activity) on screen while the drawer animates closed.
  const [member, setMember] = useState(current)
  if (current && current !== member) setMember(current)
  const isOpen = current != null
  const [openEvent, setOpenEvent] = useState<ActivityEvent | null>(null)

  const handleRemove = (person: Person) => {
    onRemove(person)
    onOpenChange(false)
  }

  return (
    <>
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      label={member?.name ?? 'Member'}
      side="end"
      width={420}
      purpose="info"
      padding={FLOATING_END_DRAWER_PADDING}
      style={floatingEndDrawerStyle({ isOpen })}
    >
      {member ? (
        <Layout
          header={
            <DrawerHeader
              title="Member"
              onOpenChange={onOpenChange}
            />
          }
          content={
            <LayoutContent>
              <VStack gap={6} hAlign="stretch" width="100%">
                <MemberProfile
                  member={member}
                  onChangeRole={onChangeRole}
                  onResendInvite={onResendInvite}
                  onRemove={handleRemove}
                />
                <Divider variant="subtle" />
                <MemberActivitySection member={member} onOpenEvent={setOpenEvent} />
              </VStack>
            </LayoutContent>
          }
        />
      ) : (
        <Layout content={<LayoutContent>{null}</LayoutContent>} />
      )}
    </Drawer>
    {/* An event's full details open over the member drawer. */}
    <ActivityDetailSheet event={openEvent} onOpenChange={(open) => !open && setOpenEvent(null)} />
    </>
  )
}
