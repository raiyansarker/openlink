import { useCallback, useMemo, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { PlusIcon } from '#/components/icons/IcnMcp'
import {
  DEMO_WORKSPACE_API_KEYS,
  type WorkspaceApiKey,
} from '#/data/demo/api-keys'
import ApiKeyRowMenu from '#/components/settings/ApiKeyRowMenu'
import CreateApiKeyDrawer from '#/components/settings/CreateApiKeyDrawer'
import type { WorkspaceMemberRole } from '#/data/demo/types'
import { workspaceMemberRoleLabel } from '#/lib/members/role-label'

type ApiKeyRow = WorkspaceApiKey & Record<string, unknown>

const API_DOCS_HREF = '/api/docs'

export default function ApiKeysSettingsFields() {
  const [apiKeys, setApiKeys] = useState<WorkspaceApiKey[]>(
    () => DEMO_WORKSPACE_API_KEYS,
  )
  const [createOpen, setCreateOpen] = useState(false)

  const keyRows = apiKeys as ApiKeyRow[]

  const revokeKey = useCallback((keyId: string) => {
    setApiKeys((prev) => prev.filter((key) => key.id !== keyId))
  }, [])

  const changeKeyRole = useCallback((keyId: string, role: WorkspaceMemberRole) => {
    setApiKeys((prev) =>
      prev.map((key) => (key.id === keyId ? { ...key, role } : key)),
    )
  }, [])

  const rotateKey = useCallback((keyId: string, prefix: string) => {
    setApiKeys((prev) =>
      prev.map((key) =>
        key.id === keyId
          ? { ...key, prefix, lastUsedAt: null }
          : key,
      ),
    )
  }, [])

  const keyColumns: TableColumn<ApiKeyRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        width: proportional(1, { minWidth: 120 }),
        renderCell: (row) => (
          <VStack gap={0.5} hAlign="start">
            <Text weight="semibold">{row.name}</Text>
            <Text type="supporting" color="secondary" maxLines={1}>
              {row.prefix}••••••••
            </Text>
          </VStack>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        width: proportional(0.8, { minWidth: 100 }),
        renderCell: (row) => (
          <Text type="supporting" color="secondary">
            {workspaceMemberRoleLabel(row.role)}
          </Text>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: pixel(56),
        align: 'end',
        renderCell: (row) => (
          <ApiKeyRowMenu
            apiKey={row}
            onChangeRole={changeKeyRole}
            onRotate={rotateKey}
            onRevoke={revokeKey}
          />
        ),
      },
    ],
    [changeKeyRole, rotateKey, revokeKey],
  )

  return (
    <VStack gap={5} hAlign="stretch" width="100%">
      <HStack
        hAlign="between"
        vAlign="center"
        gap={4}
        width="100%"
        wrap="wrap"
      >
        <VStack gap={1} hAlign="start">
          <Heading level={1}>API keys</Heading>
          <Text type="supporting" color="secondary">
            Authenticate scripts and integrations with a workspace role.
          </Text>
        </VStack>
        <Button
          variant="secondary"
          size="sm"
          label="Open API docs"
          href={API_DOCS_HREF}
          target="_blank"
          rel="noopener noreferrer"
        />
      </HStack>

      <VStack gap={3} hAlign="stretch" width="100%" paddingBlockStart={5}>
        <HStack hAlign="end" width="100%">
          <Button
            variant="secondary"
            size="sm"
            label="Create API key"
            icon={<PlusIcon size={14} style={{ display: 'flex' }} />}
            onClick={() => setCreateOpen(true)}
          />
        </HStack>

        <VStack className="members-table" width="100%" hAlign="stretch">
          <Table<ApiKeyRow>
            className="members-table__grid"
            data={keyRows}
            idKey="id"
            density="balanced"
            dividers="rows"
            textOverflow="wrap"
            columns={keyColumns}
            hasHover
          />
        </VStack>
        {keyRows.length === 0 ? (
          <Text type="supporting" color="secondary">
            No API keys yet. Create one for scripts or integrations.
          </Text>
        ) : null}
      </VStack>

      <CreateApiKeyDrawer
        isOpen={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={(key) => {
          setApiKeys((prev) => [key, ...prev])
        }}
      />
    </VStack>
  )
}
