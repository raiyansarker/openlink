import { useEffect, useState } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { useOrganization } from '#/contexts/OrganizationContext'
import type { Domain } from '#/lib/api/types'
import { exportLinks } from '#/lib/settings/export-links'

type RemoveDomainDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  domain: Domain
  /** Rejects with an Error carrying a message to show. */
  onRemove: () => Promise<void>
}

/**
 * Confirms removing a custom domain. Every link on it is deleted too, so the
 * dialog says how many, offers a CSV of them (to import onto another domain),
 * and asks for the domain name before deleting any.
 */
export default function RemoveDomainDialog({ isOpen, onOpenChange, domain, onRemove }: RemoveDomainDialogProps) {
  const { activeOrg, links } = useOrganization()
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setConfirmation('')
    setError(null)
  }, [isOpen])

  const domainLinks = links.filter((l) => l.domainId === domain.id)
  const count = Math.max(domain.linkCount, domainLinks.length)
  const one = count === 1
  const linksLabel = `${count} short ${one ? 'link' : 'links'}`
  const canConfirm = count === 0 || confirmation.trim().toLowerCase() === domain.hostname

  const remove = async () => {
    setIsRemoving(true)
    setError(null)
    try {
      await onRemove()
      onOpenChange(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not remove the domain.')
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={460}>
      <Layout
        header={<DialogHeader title={`Remove ${domain.hostname}?`} onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <VStack gap={4} hAlign="stretch" width="100%">
              {count === 0 ? (
                <Text type="supporting" color="secondary">
                  No short links use this domain. It stops serving links right away, and you can add it again later.
                </Text>
              ) : (
                <>
                  <Banner
                    status="error"
                    title={`${linksLabel} will be deleted`}
                    description={`Removing ${domain.hostname} deletes every link on it, with ${one ? 'its' : 'their'} click history. This cannot be undone.`}
                  />
                  <HStack gap={3} hAlign="between" vAlign="center" width="100%" wrap="wrap">
                    <Text type="supporting" color="secondary" style={{ flex: '1 1 14rem' }}>
                      Want to keep {one ? 'it' : 'them'}? Download a CSV, then import it onto another domain from Links.
                    </Text>
                    <Button
                      variant="secondary"
                      size="sm"
                      label={`Export ${one ? 'link' : 'links'} (CSV)`}
                      isDisabled={domainLinks.length === 0}
                      onClick={() => exportLinks(domainLinks, 'csv', `${activeOrg.slug}-${domain.hostname}`)}
                    />
                  </HStack>
                  <TextInput
                    label={`Type ${domain.hostname} to confirm`}
                    value={confirmation}
                    onChange={setConfirmation}
                    autoComplete="off"
                    autoCapitalize="none"
                    hasSpellCheck={false}
                    width="100%"
                  />
                </>
              )}
              {error ? <Banner status="error" title={error} /> : null}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end" width="100%">
              <Button variant="ghost" size="sm" label="Cancel" isDisabled={isRemoving} onClick={() => onOpenChange(false)} />
              <Button
                variant="destructive"
                size="sm"
                label={count === 0 ? 'Remove domain' : `Remove and delete ${linksLabel}`}
                isDisabled={!canConfirm}
                isLoading={isRemoving}
                onClick={() => void remove()}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}
