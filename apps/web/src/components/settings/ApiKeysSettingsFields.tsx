import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { Spinner } from '@astryxdesign/core/Spinner'
import { useOrganization } from '#/contexts/OrganizationContext'
import { ApiKeysApi } from '#/lib/api/api-keys'
import { ApiError } from '#/lib/api/error'
import { useNotify } from '#/hooks/use-notify'
import type { AssignableRole } from '#/lib/api/members'
import { QueryKeys } from '#/lib/api/query'
import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { PlusIcon } from '#/components/icons/IcnMcp'
import ApiKeyRowMenu from '#/components/settings/ApiKeyRowMenu'
import ApiKeysIllustration from '#/components/settings/ApiKeysIllustration'
import ApiKeySecretRevealDialog from '#/components/settings/ApiKeySecretRevealDialog'
import CreateApiKeyDrawer from '#/components/settings/CreateApiKeyDrawer'
import type { WorkspaceMemberRole } from '#/data/demo/types'
import type { WorkspaceApiKey } from '#/data/demo/api-keys'
import { workspaceMemberRoleLabel } from '#/lib/members/role-label'

type ApiKeyRow = WorkspaceApiKey & Record<string, unknown>

const API_DOCS_HREF = '/api/docs'
const keysApi = new ApiKeysApi()

export default function ApiKeysSettingsFields() {
  const { activeOrg } = useOrganization()
  const queryClient = useQueryClient()
  // The server only lets signed-in owners and admins manage keys.
  const canManage = activeOrg.role === 'owner' || activeOrg.role === 'admin'
  const queryKey = QueryKeys.apiKeys(activeOrg.id)
  const query = useQuery({ queryKey, queryFn: () => keysApi.list(activeOrg.id), enabled: canManage })
  const [createOpen, setCreateOpen] = useState(false)
  const notify = useNotify()
  /** The new secret after a rotation. Held here because the rotated row is replaced. */
  const [rotatedSecret, setRotatedSecret] = useState<string | null>(null)

  const apiKeys = query.data ?? []
  const keyRows = apiKeys as ApiKeyRow[]
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey }), [queryClient, queryKey])

  /** Runs a key action, showing any failure and refreshing the list either way. */
  const run = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T> => {
      try {
        return await action()
      } catch (e) {
        notify.error(ApiError.message(e))
        throw e
      } finally {
        void refresh()
      }
    },
    [refresh, notify],
  )

  const revokeKey = useCallback((keyId: string) => void run(() => keysApi.revoke(activeOrg.id, keyId)).catch(() => {}), [run, activeOrg.id])

  const changeKeyRole = useCallback(
    (keyId: string, role: WorkspaceMemberRole) => {
      if (role === 'owner') return
      void run(() => keysApi.changeRole(activeOrg.id, keyId, role)).catch(() => {})
    },
    [run, activeOrg.id],
  )

  const rotateKey = useCallback(
    (keyId: string) => {
      const key = apiKeys.find((k) => k.id === keyId)
      if (!key || key.role === 'owner') return Promise.reject(new Error('Unknown key'))
      return run(() => keysApi.rotate(activeOrg.id, { id: key.id, name: key.name, role: key.role as AssignableRole }))
        .then(setRotatedSecret)
        .catch(() => {})
    },
    [run, apiKeys, activeOrg.id],
  )

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

      {!canManage ? (
        <Text type="supporting" color="secondary" role="status">
          Only workspace owners and admins can view and manage API keys.
        </Text>
      ) : null}
      {canManage && query.isPending ? <Spinner size="md" label="Loading API keys…" /> : null}
      {canManage && query.isError ? (
        <VStack gap={2} hAlign="start" role="alert">
          <Text>{ApiError.message(query.error, 'Could not load API keys.')}</Text>
          <Button size="sm" variant="secondary" label="Try again" onClick={() => void query.refetch()} />
        </VStack>
      ) : null}

      {canManage && query.isSuccess ? (
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

        {keyRows.length > 0 ? (
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
        ) : (
          <VStack gap={3} hAlign="center" width="100%" paddingBlock={8}>
            <ApiKeysIllustration width={180} />
            <VStack gap={1} hAlign="center">
              <Text weight="semibold">No API keys yet</Text>
              <Text type="supporting" color="secondary" justify="center">
                Create a key to call the OpenLink API from scripts or integrations.
              </Text>
            </VStack>
          </VStack>
        )}
      </VStack>
      ) : null}

      <ApiKeySecretRevealDialog
        isOpen={rotatedSecret != null}
        onOpenChange={(open) => {
          if (!open) setRotatedSecret(null)
        }}
        title="Save your new key"
        body="The previous key no longer works. Copy the new key and update your integrations. You cannot view it again after you close this dialog."
        secret={rotatedSecret ?? ''}
      />

      <CreateApiKeyDrawer
        isOpen={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={(input) => {
          if (input.role === 'owner') return Promise.reject(new Error('Keys cannot be owners.'))
          return run(() => keysApi.create(activeOrg.id, { name: input.name, role: input.role as AssignableRole }))
        }}
      />
    </VStack>
  )
}
