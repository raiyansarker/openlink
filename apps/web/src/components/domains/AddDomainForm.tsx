import { useForm } from '@tanstack/react-form'
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
import { isValidCustomHostname } from '#/lib/domains/hostname'
import { checkedText, fieldStatus, submitWith } from '#/lib/forms/fields'
import DomainIllustration from './DomainIllustration'

const normalize = (hostname: string) => hostname.trim().toLowerCase()

const HostnameField = checkedText((value) => {
  const host = normalize(value)
  if (!host) return 'Enter a hostname.'
  return isValidCustomHostname(host) ? null : 'Use a valid hostname (e.g. links.example.com).'
})

export default function AddDomainForm() {
  const { activeOrg } = useOrganization()
  const { addDomain } = useDomainsWorkspace()
  const navigate = useNavigate()

  const backToDomains = () => void navigate({ to: '/w/$orgSlug/domains', params: { orgSlug: activeOrg.slug } })

  const form = useForm({
    defaultValues: { hostname: '' },
    validators: {
      onSubmitAsync: async ({ value }) => {
        try {
          await addDomain(normalize(value.hostname))
          return undefined
        } catch (err) {
          return { fields: { hostname: err instanceof Error ? err.message : 'Could not add the domain.' } }
        }
      },
    },
    onSubmit: backToDomains,
  })

  return (
    <VStack gap={5} hAlign="stretch" width="100%">
      <DomainIllustration state="add" width={160} />
      <VStack gap={1} hAlign="start" width="100%">
        <Heading level={2}>Add domain</Heading>
        <Text type="supporting" color="secondary">
          Next step: DNS records at your provider, then verify.
        </Text>
      </VStack>

      <form noValidate onSubmit={submitWith(form)}>
        <VStack gap={5} hAlign="stretch" width="100%">
          <form.Field name="hostname" validators={{ onSubmit: HostnameField }}>
            {(field) => (
              <InputGroup label="Custom domain" status={fieldStatus(field.state.meta.errors)}>
                <InputGroupText>https://</InputGroupText>
                <TextInput
                  label="Hostname"
                  isLabelHidden
                  placeholder="links.example.com"
                  value={field.state.value}
                  // A pasted URL keeps only its host part.
                  onChange={(value) => field.handleChange(value.replace(/^https?:\/\//i, ''))}
                  description="Hostname only — not a path or wildcard."
                  hasAutoFocus
                />
              </InputGroup>
            )}
          </form.Field>

          <HStack gap={3} hAlign="end" width="100%" wrap="wrap">
            <Button variant="secondary" label="Cancel" onClick={backToDomains} />
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => <Button variant="primary" type="submit" label="Continue" isLoading={isSubmitting} />}
            </form.Subscribe>
          </HStack>
        </VStack>
      </form>
    </VStack>
  )
}
