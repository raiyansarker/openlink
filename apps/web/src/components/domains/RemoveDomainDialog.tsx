import { useEffect, useState } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList'
import { Selector } from '@astryxdesign/core/Selector'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import type { WorkspaceCustomDomain } from '#/data/demo/domains'
import { ShortUrl } from '#/lib/links/short-url'

/** What happens to the domain's links: moved to a domain id, moved to the app host (`null`), or deleted (`undefined`). */
export type LinkFate = string | null | undefined

type RemoveDomainDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  domain: WorkspaceCustomDomain
  /** The workspace's other domains; only active ones can take the links. */
  otherDomains: WorkspaceCustomDomain[]
  /** Rejects with an Error carrying a message to show (e.g. back-halves already taken). */
  onRemove: (fate: LinkFate) => Promise<void>
}

const APP_HOST = 'default'

/**
 * Confirms removing a custom domain. Its links would be deleted with it, so the
 * dialog says how many, and offers to move them to another domain first.
 */
export default function RemoveDomainDialog({ isOpen, onOpenChange, domain, otherDomains, onRemove }: RemoveDomainDialogProps) {
  const targets = [
    { value: APP_HOST, label: `${ShortUrl.appHost() || 'App domain'} (default)` },
    ...otherDomains.filter((d) => d.readiness === 'active').map((d) => ({ value: d.id, label: d.hostname })),
  ]
  const [choice, setChoice] = useState<'move' | 'delete'>('move')
  const [target, setTarget] = useState(APP_HOST)
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setChoice('move')
    setTarget(APP_HOST)
    setConfirmation('')
    setError(null)
  }, [isOpen])

  const count = domain.linkCount
  const links = `${count} short ${count === 1 ? 'link' : 'links'}`
  const one = count === 1
  const deletesLinks = count > 0 && choice === 'delete'
  const canConfirm = !deletesLinks || confirmation.trim().toLowerCase() === domain.hostname

  const remove = async () => {
    setIsRemoving(true)
    setError(null)
    try {
      await onRemove(count === 0 || choice === 'delete' ? undefined : target === APP_HOST ? null : target)
      onOpenChange(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not remove the domain.')
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={480}>
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
                    status="warning"
                    title={`${links} ${one ? 'uses' : 'use'} ${domain.hostname}`}
                    description={`Removing the domain deletes ${one ? 'it' : 'them'}, with ${one ? 'its' : 'their'} click history, unless you move ${one ? 'it' : 'them'} first.`}
                  />
                  <RadioList label="What happens to its links" value={choice} onChange={(value) => setChoice(value as 'move' | 'delete')}>
                    <RadioListItem
                      value="move"
                      label={`Move ${one ? 'it' : 'them'} to another domain`}
                      description={`${one ? 'It keeps its back-half' : 'They keep their back-halves'} and analytics. Old links on this domain stop working.`}
                    />
                    <RadioListItem value="delete" label={`Delete the ${links}`} description="This cannot be undone." />
                  </RadioList>
                  {choice === 'move' ? (
                    <Selector label="Move links to" options={targets} value={target} onChange={setTarget} width="100%" />
                  ) : (
                    <TextInput
                      label={`Type ${domain.hostname} to confirm`}
                      value={confirmation}
                      onChange={setConfirmation}
                      autoComplete="off"
                      autoCapitalize="none"
                      hasSpellCheck={false}
                      width="100%"
                    />
                  )}
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
                label={count === 0 ? 'Remove domain' : choice === 'move' ? `Move ${one ? 'link' : 'links'} and remove` : `Remove and delete ${links}`}
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
