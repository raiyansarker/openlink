import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Avatar } from '@astryxdesign/core/Avatar'
import { Button } from '@astryxdesign/core/Button'
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import DeleteWorkspaceDialog from '#/components/settings/DeleteWorkspaceDialog'
import TransferOwnershipDialog from '#/components/settings/TransferOwnershipDialog'
import { useOrganization } from '#/contexts/OrganizationContext'
import { useWorkspaceDirectory } from '#/contexts/WorkspaceDirectoryContext'
import { SquareImage } from '#/lib/media/square-image'
import { MediaUploads } from '#/lib/media/uploads'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { type } from 'arktype'
import { useNavigate } from '@tanstack/react-router'
import { apiErrorMessage } from '#/lib/api/errors'
import { orpc } from '#/lib/api/orpc'
import { useNotify } from '#/hooks/use-notify'
import { usePeopleMutations } from '#/hooks/use-members'
import { ActiveWorkspace } from '#/lib/dashboard/org-slug'
import {
  isValidOrganizationSlug,
  slugifyOrganizationSlug,
} from '#/lib/organization/slugify'
import { checkedText, fieldStatus, requiredText, submitWith } from '#/lib/forms/fields'
import { exportLinks, type LinkExportFormat } from '#/lib/settings/export-links'

const FIELDS_MAX_WIDTH = 560
const LOGO_ACCEPT = SquareImage.ACCEPT

type GeneralForm = {
  name: string
  slug: string
}

const GeneralSchema = type({
  name: requiredText('Enter a workspace name.'),
  slug: checkedText((slug) => (isValidOrganizationSlug(slug) ? null : 'Use at least 2 lowercase letters, numbers, or dashes.')),
})

function SettingsBlock({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <VStack gap={3} hAlign="stretch" width="100%">
      <VStack gap={0.5} hAlign="start">
        <Heading level={4} weight="bold">
          {title}
        </Heading>
        {description ? (
          <Text type="supporting" color="secondary">
            {description}
          </Text>
        ) : null}
      </VStack>
      {children}
    </VStack>
  )
}

function ActionRow({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action: ReactNode
}) {
  return (
    <HStack hAlign="between" vAlign="center" gap={4} width="100%">
      <VStack gap={0.5} hAlign="start">
        <Text weight="semibold">{title}</Text>
        <Text type="supporting" color="secondary">
          {description}
        </Text>
      </VStack>
      {action}
    </HStack>
  )
}

export default function GeneralSettingsFields() {
  const { activeOrg, links } = useOrganization()
  const fileRef = useRef<HTMLInputElement>(null)

  const initial = useMemo<GeneralForm>(
    () => ({
      name: activeOrg.name,
      slug: activeOrg.slug,
    }),
    [activeOrg.name, activeOrg.slug],
  )
  const saved = initial
  const { invalidate: refreshWorkspaces } = useWorkspaceDirectory()
  const logoSrc = activeOrg.logoUrl ?? null
  const [logoError, setLogoError] = useState<string | null>(null)
  const [isSavingLogo, setIsSavingLogo] = useState(false)
  const canEditLogo = activeOrg.role === 'owner' || activeOrg.role === 'admin'
  const [transferOpen, setTransferOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [ownerName, setOwnerName] = useState<string | null>(null)
  const notify = useNotify()

  // Follow the saved values (they change after a save or a refresh)...
  useEffect(() => {
    form.reset(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial])

  // ...but only reset the transfer result when switching to a different workspace.
  useEffect(() => {
    setOwnerName(null)
  }, [activeOrg.id])

  const navigate = useNavigate()
  const isOwner = activeOrg.role === 'owner'
  const canEdit = isOwner || activeOrg.role === 'admin'
  const input = { params: { organizationId: activeOrg.id } }
  // Only the owner can hand the workspace over, to one of its admins.
  const membersQuery = useQuery(orpc.organizations.listMembers.queryOptions({ input, enabled: isOwner }))
  const adminCandidates = useMemo(
    () => (membersQuery.data?.items ?? []).filter((member) => member.role === 'admin'),
    [membersQuery.data],
  )
  const updateWorkspace = useMutation(orpc.organizations.updateOrganization.mutationOptions({ onSuccess: refreshWorkspaces }))
  const deleteWorkspace = useMutation(orpc.organizations.deleteOrganization.mutationOptions({ onSuccess: refreshWorkspaces }))
  const { transferOwnership } = usePeopleMutations(activeOrg.id)

  const form = useForm({
    defaultValues: initial,
    // Checked as you type, so problems show before saving.
    validators: { onChange: GeneralSchema },
    onSubmit: async ({ value }) => {
      const next = { name: value.name.trim(), slug: value.slug }
      const changes = {
        ...(next.name !== saved.name ? { name: next.name } : {}),
        ...(next.slug !== saved.slug ? { slug: next.slug } : {}),
      }
      try {
        await updateWorkspace.mutateAsync({ ...input, body: changes })
        if (changes.slug) ActiveWorkspace.remember(changes.slug)
        form.reset(next)
        notify.info('Workspace settings saved.')
      } catch (e) {
        notify.error(apiErrorMessage(e, 'Could not save the workspace.'))
      }
    },
  })

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

  /** Upload (or clear, with null) the logo in R2, then refresh the workspace everywhere. */
  const saveLogo = async (file: File | null) => {
    if (fileRef.current) fileRef.current.value = ''
    setLogoError(null)
    setIsSavingLogo(true)
    try {
      if (file) await MediaUploads.setLogo(activeOrg.id, await SquareImage.fromFile(file))
      else await MediaUploads.clearLogo(activeOrg.id)
      await refreshWorkspaces()
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : 'The logo could not be saved.')
    } finally {
      setIsSavingLogo(false)
    }
  }

  const onLogoFile = (file: File | undefined) => {
    if (file) void saveLogo(file)
  }

  const removeLogo = () => void saveLogo(null)

  const exportAs = (format: LinkExportFormat) => {
    exportLinks(links, format, saved.slug)
    notify.info(`Exported ${links.length} links as ${format.toUpperCase()}.`)
  }

  const dangerRows: { key: string; node: ReactNode }[] = [
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
    <VStack
      gap={8}
      hAlign="stretch"
      width="fill"
      style={{ width: '100%', maxWidth: FIELDS_MAX_WIDTH, alignSelf: 'stretch' }}
    >
      <SettingsBlock title="Logo" description="Shown in the workspace switcher.">
        <HStack gap={4} vAlign="center" wrap="wrap">
          <form.Subscribe selector={(state) => state.values.name.trim() || saved.name}>
            {(name) => <Avatar src={logoSrc ?? undefined} name={name} size={64} shape="rounded" tooltip={false} />}
          </form.Subscribe>
          <VStack gap={1} hAlign="start">
            <HStack gap={2} vAlign="center">
              <Button
                variant="secondary"
                size="sm"
                label={logoSrc ? 'Replace' : 'Upload'}
                isLoading={isSavingLogo}
                isDisabled={!canEditLogo}
                onClick={() => {
                  setLogoError(null)
                  fileRef.current?.click()
                }}
              />
              {logoSrc ? (
                <Button variant="ghost" size="sm" label="Remove" onClick={removeLogo} isDisabled={!canEditLogo || isSavingLogo} />
              ) : null}
            </HStack>
            <Text
              type="supporting"
              color={logoError ? 'primary' : 'secondary'}
              role={logoError ? 'alert' : undefined}
            >
              {logoError ??
                (canEditLogo ? 'PNG, JPG, WebP, or GIF up to 10 MB. We crop it to a square.' : 'Only owners and admins can change the logo.')}
            </Text>
          </VStack>
        </HStack>
        <input
          ref={fileRef}
          type="file"
          accept={LOGO_ACCEPT}
          tabIndex={-1}
          aria-hidden
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0,0,0,0)',
            border: 0,
          }}
          onChange={(event) => onLogoFile(event.target.files?.[0])}
        />
      </SettingsBlock>

      <form noValidate onSubmit={submitWith(form)}>
        <VStack gap={8} hAlign="stretch" width="100%">
          <SettingsBlock title="Workspace">
            <VStack gap={4} hAlign="stretch" width="100%">
              <form.Field name="name">
                {(field) => (
                  <TextInput
                    label="Name"
                    width="100%"
                    value={field.state.value}
                    onChange={field.handleChange}
                    status={fieldStatus(field.state.meta.errors)}
                  />
                )}
              </form.Field>
              <form.Field name="slug">
                {(field) => (
                  <>
                    <TextInput
                      label="URL"
                      width="100%"
                      value={field.state.value}
                      onChange={(value) => field.handleChange(slugifyOrganizationSlug(value.replace(/\s+/g, '-')))}
                      status={fieldStatus(field.state.meta.errors)}
                    />
                    {field.state.value !== saved.slug && field.state.meta.errors.length === 0 ? (
                      <Text type="supporting" color="secondary">
                        Old bookmarks to /{saved.slug} will stop working.
                      </Text>
                    ) : null}
                  </>
                )}
              </form.Field>
            </VStack>
          </SettingsBlock>

          <form.Subscribe
            selector={(state) =>
              [
                state.values.name !== saved.name || state.values.slug !== saved.slug,
                state.isSubmitting,
                state.isValid,
              ] as const
            }
          >
            {([isDirty, isSaving, isValid]) =>
              isDirty ? (
                <HStack gap={2} hAlign="end" width="100%">
                  <Button variant="ghost" size="sm" label="Discard" onClick={() => form.reset(saved)} />
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    label="Save changes"
                    isDisabled={!isValid || !canEdit}
                    isLoading={isSaving}
                  />
                </HStack>
              ) : null
            }
          </form.Subscribe>
        </VStack>
      </form>

      <VStack hAlign="stretch" width="100%" paddingBlockStart={4}>
        <SettingsBlock title="Danger zone">
          <VStack gap={5} hAlign="stretch" width="100%">
            {dangerRows.map((row) => (
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
    </VStack>
  )
}
