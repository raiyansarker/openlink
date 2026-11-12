import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Avatar } from '@astryxdesign/core/Avatar'
import { Button } from '@astryxdesign/core/Button'
import { Divider } from '@astryxdesign/core/Divider'
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { InputGroup, InputGroupText } from '@astryxdesign/core/InputGroup'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl'
import { Selector } from '@astryxdesign/core/Selector'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import DeleteWorkspaceDialog from '#/components/settings/DeleteWorkspaceDialog'
import TransferOwnershipDialog from '#/components/settings/TransferOwnershipDialog'
import { useOrganization } from '#/contexts/OrganizationContext'
import { getMembersForOrg } from '#/data/demo/queries'
import {
  isValidOrganizationSlug,
  slugifyOrganizationSlug,
} from '#/lib/organization/slugify'
import { exportLinks, type LinkExportFormat } from '#/lib/settings/export-links'
import {
  browserTimezone,
  currentTimeIn,
  getTimezoneOptions,
} from '#/lib/settings/timezones'

const FIELDS_MAX_WIDTH = 560
const LOGO_MAX_BYTES = 2 * 1024 * 1024
const LOGO_ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml'

type WeekStart = 'monday' | 'sunday'

type GeneralForm = {
  name: string
  slug: string
  timezone: string
  weekStart: WeekStart
}

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
      timezone: browserTimezone(),
      weekStart: 'monday',
    }),
    [activeOrg.name, activeOrg.slug],
  )
  const [saved, setSaved] = useState<GeneralForm>(initial)
  const [form, setForm] = useState<GeneralForm>(initial)
  const [logoSrc, setLogoSrc] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [ownerName, setOwnerName] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    setSaved(initial)
    setForm(initial)
    setLogoSrc(null)
    setOwnerName(null)
    setNotice(null)
  }, [initial])

  const timezoneOptions = useMemo(() => getTimezoneOptions(), [])
  const adminCandidates = useMemo(
    () =>
      getMembersForOrg(activeOrg.id).filter(
        (member) => member.role === 'admin' && member.status === 'active',
      ),
    [activeOrg.id],
  )

  const update = <K extends keyof GeneralForm>(key: K, value: GeneralForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const trimmedName = form.name.trim()
  const nameError = trimmedName.length === 0 ? 'Enter a workspace name.' : null
  const slugError = isValidOrganizationSlug(form.slug)
    ? null
    : 'Use at least 2 lowercase letters, numbers, or dashes.'
  const slugChanged = form.slug !== saved.slug
  const isDirty =
    form.name !== saved.name ||
    slugChanged ||
    form.timezone !== saved.timezone ||
    form.weekStart !== saved.weekStart
  const canSave = isDirty && !nameError && !slugError

  const onLogoFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLogoError('Choose a PNG, JPG, WebP, or SVG image.')
      return
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError('That image is larger than 2 MB.')
      return
    }
    setLogoError(null)
    const url = URL.createObjectURL(file)
    setLogoSrc((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return url
    })
  }

  const removeLogo = () => {
    setLogoError(null)
    setLogoSrc((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return null
    })
    if (fileRef.current) fileRef.current.value = ''
  }

  const exportAs = (format: LinkExportFormat) => {
    exportLinks(links, format, saved.slug)
    setNotice(`Exported ${links.length} links as ${format.toUpperCase()}.`)
  }

  const dangerRows: { key: string; node: ReactNode }[] = [
    {
      key: 'export',
      node: (
        <ActionRow
          title="Export links"
          description={`Download all ${links.length} links with their stats.`}
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
              : 'Hand billing and full control to another admin.'
          }
          action={
            <Button
              variant="secondary"
              size="sm"
              label="Transfer"
              isDisabled={ownerName != null}
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
          description="Remove all links, domains, and members for good."
          action={
            <Button
              variant="destructive"
              size="sm"
              label="Delete"
              isDisabled={ownerName != null}
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
      style={{ width: '100%', maxWidth: FIELDS_MAX_WIDTH }}
    >
      <SettingsBlock title="Logo" description="Shown in the workspace switcher.">
        <HStack gap={4} vAlign="center" wrap="wrap">
          <Avatar
            src={logoSrc ?? undefined}
            name={trimmedName || saved.name}
            size={64}
            shape="rounded"
            tooltip={false}
          />
          <VStack gap={1} hAlign="start">
            <HStack gap={2} vAlign="center">
              <Button
                variant="secondary"
                size="sm"
                label={logoSrc ? 'Replace' : 'Upload'}
                onClick={() => {
                  setLogoError(null)
                  fileRef.current?.click()
                }}
              />
              {logoSrc ? (
                <Button variant="ghost" size="sm" label="Remove" onClick={removeLogo} />
              ) : null}
            </HStack>
            <Text type="supporting" color={logoError ? 'primary' : 'secondary'}>
              {logoError ?? 'Square image, PNG or SVG, up to 2 MB.'}
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

      <SettingsBlock title="Workspace">
        <VStack gap={4} hAlign="stretch" width="100%">
          <TextInput
            label="Name"
            size="sm"
            width="100%"
            value={form.name}
            onChange={(value) => update('name', value)}
            status={nameError ? { type: 'error', message: nameError } : undefined}
          />
          <InputGroup
            label="URL"
            size="sm"
            status={slugError ? { type: 'error', message: slugError } : undefined}
          >
            <InputGroupText>openlink.app/dashboard/</InputGroupText>
            <TextInput
              label="URL"
              isLabelHidden
              size="sm"
              value={form.slug}
              onChange={(value) =>
                update('slug', slugifyOrganizationSlug(value.replace(/\s+/g, '-')))
              }
              width="100%"
              controlStyle={{ flex: '1 1 0', minWidth: 0 }}
            />
          </InputGroup>
          {slugChanged && !slugError ? (
            <Text type="supporting" color="secondary">
              Old bookmarks to /{saved.slug} will stop working.
            </Text>
          ) : null}
        </VStack>
      </SettingsBlock>

      <SettingsBlock
        title="Region"
        description="Used for analytics charts and scheduled reports."
      >
        <VStack gap={4} hAlign="stretch" width="100%">
          <Selector
            label="Timezone"
            size="sm"
            options={timezoneOptions}
            value={form.timezone}
            onChange={(value) => update('timezone', value)}
            hasSearch
            description={`It's ${currentTimeIn(form.timezone)} there now.`}
            width="100%"
          />
          <HStack hAlign="between" vAlign="center" gap={4} width="100%">
            <Text type="supporting" weight="semibold">
              Week starts on
            </Text>
            <SegmentedControl
              label="Week starts on"
              value={form.weekStart}
              onChange={(value) => update('weekStart', value as WeekStart)}
              size="sm"
            >
              <SegmentedControlItem value="monday" label="Monday" />
              <SegmentedControlItem value="sunday" label="Sunday" />
            </SegmentedControl>
          </HStack>
        </VStack>
      </SettingsBlock>

      {isDirty ? (
        <HStack gap={2} hAlign="end" width="100%">
          <Button
            variant="ghost"
            size="sm"
            label="Discard"
            onClick={() => setForm(saved)}
          />
          <Button
            variant="primary"
            size="sm"
            label="Save changes"
            isDisabled={!canSave}
            onClick={() => {
              const next = { ...form, name: trimmedName }
              setForm(next)
              setSaved(next)
              setNotice('Workspace settings saved.')
            }}
          />
        </HStack>
      ) : null}

      {notice ? (
        <Text type="supporting" color="secondary" role="status">
          {notice}
        </Text>
      ) : null}

      <Divider variant="subtle" />

      <SettingsBlock title="Danger zone">
        <VStack gap={4} hAlign="stretch" width="100%">
          {dangerRows.map((row, index) => (
            <Fragment key={row.key}>
              {index > 0 ? <Divider variant="subtle" /> : null}
              {row.node}
            </Fragment>
          ))}
        </VStack>
      </SettingsBlock>

      <TransferOwnershipDialog
        isOpen={transferOpen}
        onOpenChange={setTransferOpen}
        workspaceName={saved.name}
        candidates={adminCandidates}
        onTransfer={(memberId) => {
          const member = adminCandidates.find((m) => m.id === memberId)
          setOwnerName(member?.name ?? null)
        }}
      />
      <DeleteWorkspaceDialog
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
        workspaceName={saved.name}
        linkCount={links.length}
        onDelete={() => setNotice('Demo only: the workspace was not deleted.')}
      />
    </VStack>
  )
}
