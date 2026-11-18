import { useEffect, useState } from 'react'
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
import ApiKeySecretField from '#/components/settings/ApiKeySecretField'
import {
  FLOATING_END_DRAWER_PADDING,
  floatingEndDrawerStyle,
} from '#/components/members/floating-end-drawer'
import { ASSIGNABLE_WORKSPACE_ROLES as API_KEY_ASSIGNABLE_ROLES } from '#/lib/members/role-help'
import type { Role } from '#/lib/api/types'
import { WORKSPACE_MEMBER_ROLE_HELP } from '#/lib/members/role-help'
import { workspaceMemberRoleLabel } from '#/lib/members/role-label'

type CreateApiKeyDrawerProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  /** Creates the key on the server and resolves with its one-time secret. */
  onCreate: (input: { name: string; role: Role }) => Promise<string>
}

export default function CreateApiKeyDrawer({
  isOpen,
  onOpenChange,
  onCreate,
}: CreateApiKeyDrawerProps) {
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('member')
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setName('')
      setRole('member')
      setCreatedSecret(null)
    }
  }, [isOpen])

  const revealMode = createdSecret != null

  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed || isCreating) return
    setIsCreating(true)
    setError(null)
    try {
      setCreatedSecret(await onCreate({ name: trimmed, role }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the key.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      label="Create API key"
      side="end"
      width={400}
      purpose="form"
      padding={FLOATING_END_DRAWER_PADDING}
      style={floatingEndDrawerStyle()}
    >
      <Layout
        header={
          <DrawerHeader
            title={revealMode ? 'Save your API key' : 'Create API key'}
            subtitle={
              revealMode
                ? 'This is the only time the full key is shown.'
                : 'Keys authenticate server-side scripts and integrations.'
            }
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            {revealMode ? (
              <VStack gap={4} hAlign="stretch" width="100%">
                <Text color="secondary" type="supporting">
                  Copy the key and store it somewhere secure. You cannot view it
                  again after you close this panel.
                </Text>
                <ApiKeySecretField value={createdSecret ?? ''} />
              </VStack>
            ) : (
              <VStack gap={6} hAlign="stretch" width="100%">
                <TextInput
                  label="Name"
                  placeholder="e.g. Production"
                  value={name}
                  onChange={setName}
                  description="A label to recognize this key later."
                  isRequired
                  hasAutoFocus
                  width="100%"
                />
                <VStack gap={2} hAlign="stretch" width="100%">
                  <Text weight="semibold">Workspace role</Text>
                  <SegmentedControl
                    label="Workspace role"
                    value={role}
                    onChange={(value) =>
                      setRole(value as Role)
                    }
                    layout="fill"
                    size="sm"
                  >
                    {API_KEY_ASSIGNABLE_ROLES.map((option) => (
                      <SegmentedControlItem
                        key={option}
                        value={option}
                        label={workspaceMemberRoleLabel(option)}
                      />
                    ))}
                  </SegmentedControl>
                  <Text type="supporting" color="secondary">
                    {WORKSPACE_MEMBER_ROLE_HELP[role]}
                  </Text>
                </VStack>
              </VStack>
            )}
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end" width="100%" wrap="wrap">
              {revealMode ? (
                <Button
                  variant="primary"
                  size="sm"
                  label="Done"
                  onClick={() => onOpenChange(false)}
                />
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    label="Cancel"
                    onClick={() => onOpenChange(false)}
                  />
                  {error ? (
                    <Text type="supporting" weight="medium" role="alert">
                      {error}
                    </Text>
                  ) : null}
                  <Button
                    variant="primary"
                    size="sm"
                    label="Create key"
                    isDisabled={!name.trim()}
                    isLoading={isCreating}
                    onClick={() => void handleCreate()}
                  />
                </>
              )}
            </HStack>
          </LayoutFooter>
        }
      />
    </Drawer>
  )
}
