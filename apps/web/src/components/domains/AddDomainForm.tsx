import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { InputGroup } from '@astryxdesign/core/InputGroup'
import { InputGroupText } from '@astryxdesign/core/InputGroup'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { useDomainsWorkspace } from '#/contexts/DomainsWorkspaceContext'
import { useOrganization } from '#/contexts/OrganizationContext'
import type { WorkspaceCustomDomain } from '#/data/demo/domains'
import {
  demoDnsRecordsForHostname,
  isValidCustomHostname,
} from '#/lib/domains/demo-dns'
import DomainIllustration from './DomainIllustration'

export default function AddDomainForm() {
  const { activeOrg } = useOrganization()
  const { addDomain } = useDomainsWorkspace()
  const navigate = useNavigate()

  const [hostname, setHostname] = useState('')
  const [error, setError] = useState<string | null>(null)

  const onHostnameChange = (value: string) => {
    const stripped = value.replace(/^https?:\/\//i, '')
    setHostname(stripped)
    if (error) setError(null)
  }

  const submit = () => {
    const normalized = hostname.trim().toLowerCase()
    if (!normalized) {
      setError('Enter a hostname.')
      return
    }
    if (!isValidCustomHostname(normalized)) {
      setError('Use a valid hostname (e.g. links.example.com).')
      return
    }

    const domain: WorkspaceCustomDomain = {
      id: `dom_${Date.now()}`,
      orgId: activeOrg.id,
      hostname: normalized,
      readiness: 'pending',
      linkCount: 0,
      createdAt: new Date().toISOString(),
      dnsRecords: demoDnsRecordsForHostname(normalized),
    }

    addDomain(domain)
    void navigate({
      to: '/dashboard/$orgSlug/domains',
      params: { orgSlug: activeOrg.slug },
    })
  }

  return (
    <VStack gap={5} hAlign="stretch" width="100%">
      <DomainIllustration state="add" width={160} />
      <VStack gap={1} hAlign="start" width="100%">
        <Heading level={2}>Add domain</Heading>
        <Text type="supporting" color="secondary">
          Next step: DNS records at your provider, then verify.
        </Text>
      </VStack>

      <InputGroup label="Custom domain">
        <InputGroupText>https://</InputGroupText>
        <TextInput
          label="Hostname"
          isLabelHidden
          placeholder="links.example.com"
          value={hostname}
          onChange={onHostnameChange}
          description={
            error ?? 'Hostname only — not a path or wildcard.'
          }
          hasAutoFocus
        />
      </InputGroup>

      <HStack gap={3} hAlign="end" width="100%" wrap="wrap">
        <Button
          variant="secondary"
          label="Cancel"
          onClick={() =>
            void navigate({
              to: '/dashboard/$orgSlug/domains',
              params: { orgSlug: activeOrg.slug },
            })
          }
        />
        <Button variant="primary" label="Continue" onClick={submit} />
      </HStack>
    </VStack>
  )
}
