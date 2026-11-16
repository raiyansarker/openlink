import { Section } from '@astryxdesign/core/Section'
import { Text } from '@astryxdesign/core/Text'

/** The page's one message, announced to screen readers. */
export default function AuthStatus({ error, notice }: { error: string; notice: string }) {
  return (
    <Section id="auth-status" variant="transparent" padding={0} role="status" aria-live="polite">
      {error ? (
        <Text size="sm" weight="medium" role="alert" justify="center">
          {error}
        </Text>
      ) : notice ? (
        <Text size="sm" color="secondary" justify="center">
          {notice}
        </Text>
      ) : null}
    </Section>
  )
}
