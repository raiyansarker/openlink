import { useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@astryxdesign/core/Button'
import { Divider } from '@astryxdesign/core/Divider'
import { Icon } from '@astryxdesign/core/Icon'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import PasswordField from '#/components/common/PasswordField'
import { AuthSession } from '#/lib/auth/client'
import { AuthErrorMessages } from '#/lib/auth/error-messages'
import AuthShell from './AuthShell'
import ProviderButtons, { hasProviders } from './ProviderButtons'
import { useAuthActions, type AuthProvider } from './use-auth-actions'

type SignUpPageProps = {
  destination: string
  redirect?: string
  oauthError?: string
  providers: Record<AuthProvider, boolean>
  emailPassword: boolean
}

export default function SignUpPage({ destination, redirect, oauthError, providers, emailPassword }: SignUpPageProps) {
  const navigate = useNavigate()
  const auth = useAuthActions({ destination, returnPath: '/signup', initialError: AuthErrorMessages.oauth(oauthError) })
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void auth.run('email', async () => {
      try {
        const { error } = await AuthSession.client.signUp.email({
          // Left blank, the name starts as the part of the email before the @.
          name: name.trim() || email.trim().split('@')[0]!,
          email: email.trim(),
          password,
        })
        if (error) return AuthErrorMessages.emailSignUp(error)
        await auth.finish()
      } catch {
        return AuthErrorMessages.emailSignUp(undefined)
      }
    })
  }

  const signIn = { to: '/login' as const, ...(redirect ? { redirect } : {}) }

  return (
    <AuthShell
      heading="Create your account"
      subheading="Short links, QR codes and analytics, in a minute."
      switchTo={{ prompt: 'Already have an account?', label: 'Log in', ...signIn }}
    >
      {/* Google and GitHub create the account on first sign-in. */}
      <ProviderButtons providers={providers} pending={auth.pending} onSocial={(p) => void auth.social(p)} />

      {emailPassword ? (
        <>
          {hasProviders(providers) ? (
            <Divider
              label={
                <Text size="xsm" color="secondary">
                  or with email
                </Text>
              }
            />
          ) : null}
          <form method="post" onSubmit={submit}>
            <VStack gap={4} hAlign="stretch">
              <TextInput
                label="Your name"
                placeholder="Ada Lovelace"
                value={name}
                onChange={setName}
                autoComplete="name"
                htmlName="name"
                width="100%"
                isOptional
              />
              <TextInput
                label="Email address"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                autoCapitalize="none"
                hasSpellCheck={false}
                htmlName="email"
                width="100%"
                isRequired
              />
              <PasswordField
                label="Password"
                placeholder="At least 8 characters"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                htmlName="password"
                isRequired
              />
              <Button
                label="Create account"
                variant="primary"
                type="submit"
                width="100%"
                isLoading={auth.pending === 'email'}
                isDisabled={auth.pending !== null}
                endContent={<Icon icon="chevronRight" size="sm" />}
              />
            </VStack>
          </form>
        </>
      ) : !hasProviders(providers) ? (
        <Text size="sm" color="secondary" role="status" justify="center">
          Sign-up is not configured yet. Add Google or GitHub credentials to the server.
        </Text>
      ) : null}

      <Divider />
      <VStack gap={2} hAlign="stretch">
        <Text size="sm" color="secondary" justify="center">
          Already have an account?
        </Text>
        <Button
          variant="secondary"
          label="Log in instead"
          width="100%"
          href={signIn.redirect ? `/login?redirect=${encodeURIComponent(signIn.redirect)}` : '/login'}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            event.preventDefault()
            void navigate({ to: '/login', search: signIn.redirect ? { redirect: signIn.redirect } : {} })
          }}
        />
      </VStack>
    </AuthShell>
  )
}
