import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { InputGroup } from '@astryxdesign/core/InputGroup'
import { Selector } from '@astryxdesign/core/Selector'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import DomainDetailSheet, {
  type DomainSheetTarget,
} from '#/components/domains/DomainDetailSheet'
import DomainIllustration from '#/components/domains/DomainIllustration'
import DomainNameCell from '#/components/domains/DomainNameCell'
import { handleDomainsTableRowClick } from '#/components/domains/domains-table-row-click'
import DomainRowMenu from '#/components/domains/DomainRowMenu'
import DomainStatus from '#/components/domains/DomainStatus'
import { PlusIcon } from '#/components/icons/IcnMcp'
import { useDomainsWorkspace } from '#/contexts/DomainsWorkspaceContext'
import { useOrganization } from '#/contexts/OrganizationContext'
import type { WorkspaceCustomDomain } from '#/data/demo/domains'
import {
  DOMAIN_STATUS_FILTER_OPTIONS,
  matchesDomainSearch,
  matchesDomainStatusFilter,
  type DomainStatusFilter,
} from '#/lib/domains/filter-options'
import { formatShortDate } from '#/lib/format/short-date'

type DomainRow = WorkspaceCustomDomain & Record<string, unknown>

export default function DashboardDomainsPanel() {
  const { activeOrg } = useOrganization()
  const {
    customDomains,
    detailRequestDomainId,
    verifyDomain,
    removeDomain,
    consumeDetailRequest,
  } = useDomainsWorkspace()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<DomainStatusFilter>('all')
  const [sheetTarget, setSheetTarget] = useState<DomainSheetTarget | null>(null)

  useEffect(() => {
    setSearchQuery('')
    setStatusFilter('all')
    setSheetTarget(null)
  }, [activeOrg.id])

  useEffect(() => {
    if (!detailRequestDomainId) return
    setSheetTarget({ kind: 'custom', domainId: detailRequestDomainId })
    consumeDetailRequest()
  }, [detailRequestDomainId, consumeDetailRequest])

  const rows = useMemo(
    () =>
      (customDomains as DomainRow[]).filter(
        (row) =>
          matchesDomainSearch(row.hostname, searchQuery) &&
          matchesDomainStatusFilter(row.readiness, statusFilter),
      ),
    [customDomains, searchQuery, statusFilter],
  )

  const goToAddDomain = () =>
    void navigate({
      to: '/dashboard/$orgSlug/domains/new',
      params: { orgSlug: activeOrg.slug },
    })

  const openDomain = (domainId: string) =>
    setSheetTarget({ kind: 'custom', domainId })

  const openCustomDomain = (domain: WorkspaceCustomDomain) =>
    openDomain(domain.id)

  const openRowAtIndex = (index: number) => {
    const row = rows[index]
    if (row) openDomain(row.id)
  }

  return (
    <VStack
      gap={8}
      hAlign="stretch"
      width="fill"
      paddingBlockStart={8}
      paddingInline={8}
      paddingBlockEnd={10}
    >
      <HStack
        hAlign="between"
        vAlign="start"
        gap={4}
        width="fill"
        wrap="wrap"
      >
        <VStack gap={2} hAlign="start" width="fill">
          <Heading level={1}>Domains</Heading>
          <Text color="secondary" type="supporting">
            Hostnames that serve short links for {activeOrg.name}.
          </Text>
        </VStack>
        <Button
          variant="secondary"
          size="sm"
          label="Add domain"
          icon={<PlusIcon size={14} style={{ display: 'flex' }} />}
          onClick={goToAddDomain}
        />
      </HStack>

      {customDomains.length === 0 ? (
        <EmptyState
          isCompact
          headingLevel={4}
          icon={<DomainIllustration state="add" width={180} />}
          title="Use your own domain"
          description="Add a domain like go.yourbrand.com to serve your short links from it."
          actions={
            <Button
              variant="secondary"
              size="sm"
              label="Add domain"
              onClick={goToAddDomain}
            />
          }
        />
      ) : (
        <VStack gap={5} width="fill" hAlign="stretch">
          <InputGroup label="Search domains" size="sm">
            <TextInput
              label="Search domains"
              isLabelHidden
              size="sm"
              placeholder="Filter by hostname"
              value={searchQuery}
              onChange={setSearchQuery}
              controlStyle={{ flex: '4 1 0', minWidth: 0, width: '80%' }}
            />
            <Selector
              label="Status"
              isLabelHidden
              variant="secondary"
              size="sm"
              width="20%"
              controlStyle={{ flex: '1 0 0', minWidth: 0, width: '100%' }}
              options={DOMAIN_STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as DomainStatusFilter)}
              placeholder="All"
            />
          </InputGroup>

          <VStack
            className="members-table members-table--clickable-rows"
            width="100%"
            hAlign="stretch"
            onClick={(event) =>
              handleDomainsTableRowClick(event, rows.length, openRowAtIndex)
            }
          >
            <Table<DomainRow>
              className="members-table__grid"
              data={rows}
              idKey="id"
              density="balanced"
              dividers="rows"
              hasHover
              columns={[
                {
                  key: 'hostname',
                  header: 'Domain',
                  width: proportional(1.4, { minWidth: 180 }),
                  renderCell: (row) => (
                    <DomainNameCell hostname={row.hostname} />
                  ),
                },
                {
                  key: 'readiness',
                  header: 'Status',
                  width: pixel(132),
                  renderCell: (row) => (
                    <DomainStatus readiness={row.readiness} />
                  ),
                },
                {
                  key: 'linkCount',
                  header: 'Links',
                  width: pixel(88),
                  align: 'end',
                  renderCell: (row) => (
                    <Text weight="medium">{row.linkCount}</Text>
                  ),
                },
                {
                  key: 'createdAt',
                  header: 'Added',
                  width: pixel(108),
                  align: 'end',
                  renderCell: (row) => (
                    <Text type="supporting" color="secondary">
                      {formatShortDate(row.createdAt)}
                    </Text>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  width: pixel(56),
                  align: 'end',
                  renderCell: (row) => (
                    <DomainRowMenu
                      domain={row}
                      onOpen={openCustomDomain}
                      onVerify={verifyDomain}
                      onRemove={removeDomain}
                    />
                  ),
                },
              ]}
            />
          </VStack>

          {rows.length === 0 ? (
            <Text type="supporting" color="secondary">
              No domains match your filters.
            </Text>
          ) : null}
        </VStack>
      )}

      <DomainDetailSheet
        target={sheetTarget}
        onOpenChange={(open) => {
          if (!open) setSheetTarget(null)
        }}
      />
    </VStack>
  )
}
