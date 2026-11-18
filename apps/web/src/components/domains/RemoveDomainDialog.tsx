import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
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
import { firstError, submitWith } from '#/lib/forms/fields'

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

  const domainLinks = links.filter((l) => l.domainId === domain.id)
  const count = Math.max(domain.linkCount, domainLinks.length)
  const one = count === 1
  const linksLabel = `${count} short ${one ? 'link' : 'links'}`
  const isConfirmed = (confirmation: string) => count === 0 || confirmation.trim().toLowerCase() === domain.hostname

  const form = useForm({
    defaultValues: { confirmation: '' },
    validators: {
      onSubmitAsync: async ({ value }) => {
        if (!isConfirmed(value.confirmation)) return 'Type the domain name to confirm.'
        try {
          await onRemove()
          return undefined
        } catch (caught) {
          return caught instanceof Error ? caught.message : 'Could not remove the domain.'
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
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={460}>
      <Layout
        header={<DialogHeader title={`Remove ${domain.hostname}?`} onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <form noValidate onSubmit={submitWith(form)}>
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
                  <form.Field name="confirmation">
                    {(field) => (
                      <TextInput
                        label={`Type ${domain.hostname} to confirm`}
                        value={field.state.value}
                        onChange={field.handleChange}
                        autoComplete="off"
                        autoCapitalize="none"
                        hasSpellCheck={false}
                        width="100%"
                      />
                    )}
                  </form.Field>
                </>
              )}
              <form.Subscribe selector={(state) => firstError(state.errors)}>
                {(error) => (error ? <Banner status="error" title={error} /> : null)}
              </form.Subscribe>
            </VStack>
            </form>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end" width="100%">
              <form.Subscribe selector={(state) => [state.isSubmitting, isConfirmed(state.values.confirmation)] as const}>
                {([isRemoving, canConfirm]) => (
                  <>
                    <Button variant="ghost" size="sm" label="Cancel" isDisabled={isRemoving} onClick={() => onOpenChange(false)} />
                    <Button
                      variant="destructive"
                      size="sm"
                      label={count === 0 ? 'Remove domain' : `Remove and delete ${linksLabel}`}
                      isDisabled={!canConfirm}
                      isLoading={isRemoving}
                      onClick={() => void form.handleSubmit()}
                    />
                  </>
                )}
              </form.Subscribe>
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}
