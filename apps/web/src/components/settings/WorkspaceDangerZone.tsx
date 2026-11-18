import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@astryxdesign/core/Button'
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { VStack } from '@astryxdesign/core/VStack'
import DeleteWorkspaceDialog from '#/components/settings/DeleteWorkspaceDialog'
import TransferOwnershipDialog from '#/components/settings/TransferOwnershipDialog'
import { ActionRow, SettingsBlock } from '#/components/settings/WorkspaceSettingsParts'
import { useOrganization } from '#/contexts/OrganizationContext'
import { useWorkspaceDirectory } from '#/contexts/WorkspaceDirectoryContext'
import { useNotify } from '#/hooks/use-notify'
import { usePeopleMutations } from '#/hooks/use-members'
import { apiErrorMessage } from '#/lib/api/errors'
import { orpc } from '#/lib/api/orpc'
import { exportLinks, type LinkExportFormat } from '#/lib/settings/export-links'

type WorkspaceDangerZoneProps = {
  /** The saved workspace name and URL (not what is being typed). */
  saved: { name: string; slug: string }
}

/** Export links, transfer ownership and delete the workspace. */
export default function WorkspaceDangerZone({ saved }: WorkspaceDangerZoneProps) {
  const { activeOrg, links } = useOrganization()
  const { invalidate: refreshWorkspaces } = useWorkspaceDirectory()
  const navigate = useNavigate()
  const notify = useNotify()
  const [transferOpen, setTransferOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [ownerName, setOwnerName] = useState<string | null>(null)

  // Only reset the transfer result when switching to a different workspace.
  useEffect(() => {
    setOwnerName(null)
  }, [activeOrg.id])

  const isOwner = activeOrg.role === 'owner'
  const input = { params: { organizationId: activeOrg.id } }
  // Only the owner can hand the workspace over, to one of its admins.
  const membersQuery = useQuery(orpc.organizations.listMembers.queryOptions({ input, enabled: isOwner }))
  const adminCandidates = useMemo(
    () => (membersQuery.data?.items ?? []).filter((member) => member.role === 'admin'),
    [membersQuery.data],
  )
  const deleteWorkspace = useMutation(orpc.organizations.deleteOrganization.mutationOptions({ onSuccess: refreshWorkspaces }))
  const { transferOwnership } = usePeopleMutations(activeOrg.id)

  const transfer = async (userId: string) => {
    try {
      await transferOwnership.mutateAsync({ ...input, body: { userId } })
      const member = adminCandidates.find((m) => m.userId === userId)
      setOwnerName(member?.name ?? null)
    } catch (e) {
      notify.error(apiErrorMessage(e, 'Could not transfer ownership.'))
    }
  }

  const remove = async () => {
    try {
      await deleteWorkspace.mutateAsync(input)
      await navigate({ to: '/w', replace: true })
    } catch (e) {
      notify.error(apiErrorMessage(e, 'Could not delete the workspace.'))
    }
  }

  const exportAs = (format: LinkExportFormat) => {
    exportLinks(links, format, saved.slug)
    notify.info(`Exported ${links.length} links as ${format.toUpperCase()}.`)
  }

  const rows: { key: string; node: ReactNode }[] = [
    {
      key: 'export',
      node: (
        <ActionRow
          title="Export links"
          description={
            links.length === 0
              ? 'No links to export yet.'
              : `Download all ${links.length} links with their stats.`
          }
          action={
            <DropdownMenu
              hasChevron={false}
              presentation="popover"
              placement="below"
              alignment="end"
              menuWidth={160}
              renderTrigger={(triggerProps) => (
                <Button
                  {...triggerProps}
                  variant="secondary"
                  size="sm"
                  label="Export"
                  isDisabled={links.length === 0}
                />
              )}
              items={[
                { id: 'csv', label: 'CSV', onClick: () => exportAs('csv') },
                { id: 'json', label: 'JSON', onClick: () => exportAs('json') },
              ]}
            />
          }
        />
      ),
    },
    {
      key: 'transfer',
      node: (
        <ActionRow
          title="Transfer ownership"
          description={
            ownerName
              ? `${ownerName} now owns this workspace.`
              : isOwner
                ? 'Hand full control to another admin.'
                : 'Only the owner can transfer the workspace.'
          }
          action={
            <Button
              variant="secondary"
              size="sm"
              label="Transfer"
              isDisabled={ownerName != null || !isOwner}
              onClick={() => setTransferOpen(true)}
            />
          }
        />
      ),
    },
    {
      key: 'delete',
      node: (
        <ActionRow
          title="Delete workspace"
          description={isOwner ? 'Remove all links, domains, and members for good.' : 'Only the owner can delete the workspace.'}
          action={
            <Button
              variant="destructive"
              size="sm"
              label="Delete"
              isDisabled={ownerName != null || !isOwner}
              onClick={() => setDeleteOpen(true)}
            />
          }
        />
      ),
    },
  ]

  return (
    <>
      <VStack hAlign="stretch" width="100%" paddingBlockStart={4}>
        <SettingsBlock title="Danger zone">
          <VStack gap={5} hAlign="stretch" width="100%">
            {rows.map((row) => (
              <Fragment key={row.key}>{row.node}</Fragment>
            ))}
          </VStack>
        </SettingsBlock>
      </VStack>

      <TransferOwnershipDialog
        isOpen={transferOpen}
        onOpenChange={setTransferOpen}
        workspaceName={saved.name}
        candidates={adminCandidates}
        onTransfer={(memberId) => void transfer(memberId)}
      />
      <DeleteWorkspaceDialog
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
        workspaceName={saved.name}
        linkCount={links.length}
        onDelete={() => void remove()}
      />
    </>
  )
}
