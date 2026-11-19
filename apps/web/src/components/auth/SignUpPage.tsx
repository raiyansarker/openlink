import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { type } from 'arktype'
import { Button } from '@astryxdesign/core/Button'
import { Divider } from '@astryxdesign/core/Divider'
import { Icon } from '@astryxdesign/core/Icon'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import PasswordField from '#/components/common/PasswordField'
import { AuthSession } from '#/lib/auth/client'
import { AuthErrorMessages } from '#/lib/auth/error-messages'
import { fieldStatus, requiredEmail, requiredExact, submitWith } from '#/lib/forms/fields'
import { CheckInboxIllustration } from './AuthIllustrations'
import AuthShell from './AuthShell'
import CheckInboxPanel from './CheckInboxPanel'
import ProviderButtons from './ProviderButtons'
import { hasProviders } from './auth-providers'
import { useAuthActions, type AuthProvider } from './use-auth-actions'

const SignUpSchema = type({
  name: 'string',
  email: requiredEmail({ required: 'Enter your email address.', invalid: 'Enter a valid email address.' }),
  password: requiredExact('Enter a password.'),
})

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
  /** Set once the account exists but its email is not verified yet. */
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const form = useForm({
    defaultValues: { name: '', email: '', password: '' },
    validators: { onSubmit: SignUpSchema },
    onSubmit: ({ value }) =>
      auth.run('email', async () => {
        try {
          const email = value.email.trim()
          const { data, error } = await AuthSession.client.signUp.email({
            // Left blank, the name starts as the part of the email before the @.
            name: value.name.trim() || email.split('@')[0]!,
            email,
            password: value.password,
            callbackURL: '/verify-email',
          })
          if (error) return AuthErrorMessages.emailSignUp(error)
          // Email accounts have no session until the address is verified.
          if (!data?.token) {
            // Nothing typed (least of all the password) stays on the page after the account is made.
            form.reset()
            return void setPendingEmail(email)
          }
          await auth.finish()
        } catch {
          return AuthErrorMessages.emailSignUp(undefined)
        }
      }),
  })

  const signIn = { to: '/login' as const, ...(redirect ? { redirect } : {}) }

  if (pendingEmail) {
    return (
      <AuthShell
        heading="Check your inbox"
        subheading={`A verification link is on its way to ${pendingEmail}.`}
        switchTo={{ prompt: 'Already verified?', label: 'Log in', ...signIn }}
        illustration={<CheckInboxIllustration />}
      >
        <CheckInboxPanel
          email={pendingEmail}
          onBack={() => void navigate({ to: '/login', search: signIn.redirect ? { redirect: signIn.redirect } : {} })}
        />
      </AuthShell>
    )
  }

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
          <form
            method="post"
            noValidate
            onSubmit={submitWith(form)}
          >
            <VStack gap={4} hAlign="stretch">
              <form.Field name="name">
                {(field) => (
                  <TextInput
                    label="Your name"
                    placeholder="Ada Lovelace"
                    value={field.state.value}
                    onChange={field.handleChange}
                    autoComplete="name"
                    htmlName="name"
                    width="100%"
                    isOptional
                  />
                )}
              </form.Field>
              <form.Field name="email">
                {(field) => (
                  <TextInput
                    label="Email address"
                    type="email"
                    placeholder="you@company.com"
                    value={field.state.value}
                    onChange={field.handleChange}
                    status={fieldStatus(field.state.meta.errors)}
                    autoComplete="email"
                    autoCapitalize="none"
                    hasSpellCheck={false}
                    htmlName="email"
                    width="100%"
                    isRequired
                  />
                )}
              </form.Field>
              <form.Field name="password">
                {(field) => (
                  <PasswordField
                    label="Password"
                    placeholder="At least 8 characters"
                    value={field.state.value}
                    onChange={field.handleChange}
                    status={fieldStatus(field.state.meta.errors)}
                    autoComplete="new-password"
                    htmlName="password"
                    isRequired
                  />
                )}
              </form.Field>
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
