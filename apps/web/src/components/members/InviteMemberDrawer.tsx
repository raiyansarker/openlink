import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { type } from 'arktype'
import { Button } from '@astryxdesign/core/Button'
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import type { Role } from '#/lib/api/types'
import { fieldStatus, requiredEmail, submitWith } from '#/lib/forms/fields'
import { usePermissions } from '#/hooks/use-permissions'
import { WORKSPACE_MEMBER_ROLE_HELP } from '#/lib/members/role-help'
import { workspaceMemberRoleLabel } from '#/lib/members/role-label'
import {
  FLOATING_END_DRAWER_PADDING,
  floatingEndDrawerStyle,
} from './floating-end-drawer'

const InviteSchema = type({
  email: requiredEmail({ required: 'Enter an email address.', invalid: 'Enter a valid email address.' }),
  role: "'member' | 'admin' | 'owner'",
})

type InviteMemberDrawerProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  workspaceName: string
  /** Throws an Error with a user-facing message when the invite is rejected. */
  onSubmit: (email: string, role: Role) => Promise<void>
}

export default function InviteMemberDrawer({
  isOpen,
  onOpenChange,
  workspaceName,
  onSubmit,
}: InviteMemberDrawerProps) {
  // Admins may only invite members and viewers; owners may invite admins too.
  const { assignableRoles } = usePermissions()
  const form = useForm({
    defaultValues: { email: '', role: 'member' as Role },
    validators: {
      onSubmit: InviteSchema,
      onSubmitAsync: async ({ value }) => {
        try {
          await onSubmit(value.email.trim().toLowerCase(), value.role)
          return undefined
        } catch (err) {
          return { fields: { email: err instanceof Error ? err.message : 'Could not send the invite.' } }
        }
      },
    },
    onSubmit: () => onOpenChange(false),
  })

  useEffect(() => {
    if (isOpen) form.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      label="Invite people"
      side="end"
      width={400}
      purpose="form"
      padding={FLOATING_END_DRAWER_PADDING}
      style={floatingEndDrawerStyle({ isOpen })}
    >
      <Layout
        header={
          <DrawerHeader
            title="Invite people"
            subtitle={workspaceName}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <form
              noValidate
              onSubmit={submitWith(form)}
            >
              <VStack gap={6} hAlign="stretch" width="100%">
                <VStack gap={1} hAlign="start" width="100%">
                  <Text color="secondary" type="supporting">
                    Send a workspace invite by email. They pick a password on
                    first sign-in.
                  </Text>
                </VStack>

                <form.Field name="email">
                  {(field) => (
                    <TextInput
                      label="Email"
                      width="100%"
                      type="email"
                      placeholder="colleague@company.com"
                      value={field.state.value}
                      onChange={field.handleChange}
                      status={fieldStatus(field.state.meta.errors)}
                      isRequired
                      hasAutoFocus
                    />
                  )}
                </form.Field>

                <form.Field name="role">
                  {(field) => (
                    <VStack gap={2} hAlign="stretch" width="100%">
                      <Text weight="semibold">Workspace role</Text>
                      <SegmentedControl
                        label="Workspace role"
                        value={field.state.value}
                        onChange={(value) =>
                          field.handleChange(value as Role)
                        }
                        layout="fill"
                        size="sm"
                      >
                        {assignableRoles.map((option) => (
                          <SegmentedControlItem
                            key={option}
                            value={option}
                            label={workspaceMemberRoleLabel(option)}
                          />
                        ))}
                      </SegmentedControl>
                      <Text type="supporting" color="secondary">
                        {WORKSPACE_MEMBER_ROLE_HELP[field.state.value]}
                      </Text>
                    </VStack>
                  )}
                </form.Field>
              </VStack>
            </form>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end" width="100%" wrap="wrap">
              <Button
                variant="ghost"
                size="sm"
                label="Cancel"
                onClick={() => onOpenChange(false)}
              />
              <form.Subscribe selector={(state) => [state.values.email, state.isSubmitting] as const}>
                {([email, isSubmitting]) => (
                  <Button
                    variant="primary"
                    size="sm"
                    label="Send invite"
                    isDisabled={!email.trim()}
                    isLoading={isSubmitting}
                    onClick={() => void form.handleSubmit()}
                  />
                )}
              </form.Subscribe>
            </HStack>
          </LayoutFooter>
        }
      />
    </Drawer>
  )
}
