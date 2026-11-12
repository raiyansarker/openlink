import { useMemo, useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { Divider } from '@astryxdesign/core/Divider'
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import {
  FLOATING_END_DRAWER_PADDING,
  floatingEndDrawerStyle,
} from '#/components/members/floating-end-drawer'
import { useDomainsWorkspace } from '#/contexts/DomainsWorkspaceContext'
import type { WorkspaceCustomDomain } from '#/data/demo/domains'
import {
  buildDefaultDomainTimeline,
  buildDomainTimeline,
} from '#/lib/domains/domain-timeline'
import { formatShortDate } from '#/lib/format/short-date'
import DomainDnsRecordsTable from './DomainDnsRecordsTable'
import DomainReadinessBanner from './DomainReadinessBanner'
import DomainSetupTimeline from './DomainSetupTimeline'

export type DomainSheetTarget =
  | {
      kind: 'default'
      hostname: string
      linkCount: number
    }
  | {
      kind: 'custom'
      domainId: string
    }

type DomainDetailSheetProps = {
  target: DomainSheetTarget | null
  onOpenChange: (open: boolean) => void
}

export default function DomainDetailSheet({
  target,
  onOpenChange,
}: DomainDetailSheetProps) {
  const { getDomainById, verifyDomain, removeDomain } = useDomainsWorkspace()
  const [removeAlertOpen, setRemoveAlertOpen] = useState(false)

  const isOpen = target != null
  const isDefault = target?.kind === 'default'
  const custom: WorkspaceCustomDomain | undefined =
    target?.kind === 'custom' ? getDomainById(target.domainId) : undefined

  const title =
    target?.kind === 'default'
      ? target.hostname
      : (custom?.hostname ?? 'Domain')

  const readiness = isDefault ? 'active' : (custom?.readiness ?? 'pending')
  const statusHint =
    readiness === 'active'
      ? 'Short links are live on this host'
      : undefined

  const timelineEvents = useMemo(() => {
    if (isDefault && target?.kind === 'default') {
      return buildDefaultDomainTimeline(target.linkCount)
    }
    if (custom) return buildDomainTimeline(custom)
    return []
  }, [custom, isDefault, target])

  const close = () => onOpenChange(false)

  const confirmRemove = () => {
    if (!custom) return
    removeDomain(custom.id)
    setRemoveAlertOpen(false)
    close()
  }

  if (target?.kind === 'custom' && !custom) {
    return null
  }

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        label={title}
        side="end"
        width={440}
        hasScrim
        padding={FLOATING_END_DRAWER_PADDING}
        style={floatingEndDrawerStyle()}
      >
        <Layout
          header={
            <DrawerHeader
              title={title}
              subtitle={statusHint}
              onOpenChange={onOpenChange}
            />
          }
          content={
            <LayoutContent>
              <VStack gap={6} width="100%" hAlign="stretch">
                {custom ? (
                  <DomainReadinessBanner readiness={custom.readiness} />
                ) : null}

                {isDefault && target ? (
                  <Text type="supporting" color="secondary">
                    {target.linkCount} short links on the default workspace
                    host.
                  </Text>
                ) : null}

                {custom ? (
                  <>
                    <VStack gap={4} width="100%" hAlign="stretch">
                      <VStack gap={1} width="100%" hAlign="stretch">
                        <Text weight="semibold">DNS records</Text>
                        <Text type="supporting" color="secondary">
                          Add these at your DNS provider. Click a value to copy it.
                        </Text>
                      </VStack>
                      <DomainDnsRecordsTable
                        domainHostname={custom.hostname}
                        records={custom.dnsRecords}
                      />
                      {custom.readiness !== 'active' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          label="Verify DNS"
                          onClick={() => verifyDomain(custom.id)}
                        />
                      ) : null}
                    </VStack>

                    <DomainSetupTimeline events={timelineEvents} />

                    <Divider variant="subtle" />

                    <VStack gap={2} width="100%">
                      <Text type="supporting" color="secondary">
                        {custom.linkCount} links · added{' '}
                        {formatShortDate(custom.createdAt)}
                      </Text>
                    </VStack>
                  </>
                ) : target?.kind === 'default' ? (
                  <DomainSetupTimeline events={timelineEvents} />
                ) : null}
              </VStack>
            </LayoutContent>
          }
          footer={
            custom ? (
              <LayoutFooter>
                <HStack hAlign="start" width="100%">
                  <Button
                    variant="destructive"
                    size="sm"
                    label="Remove domain"
                    onClick={() => setRemoveAlertOpen(true)}
                  />
                </HStack>
              </LayoutFooter>
            ) : undefined
          }
        />
      </Drawer>

      {custom ? (
        <AlertDialog
          isOpen={removeAlertOpen}
          onOpenChange={setRemoveAlertOpen}
          title={`Remove ${custom.hostname}?`}
          description="Short links on this host stop working immediately. This cannot be undone."
          actionLabel="Remove domain"
          onAction={confirmRemove}
        />
      ) : null}
    </>
  )
}
