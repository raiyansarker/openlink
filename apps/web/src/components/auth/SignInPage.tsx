import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { type } from 'arktype'
import { Button } from '@astryxdesign/core/Button'
import { Divider } from '@astryxdesign/core/Divider'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { Link } from '@astryxdesign/core/Link'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import PasswordField from '#/components/common/PasswordField'
import { AuthSession } from '#/lib/auth/client'
import { AuthErrorMessages } from '#/lib/auth/error-messages'
import { fieldStatus, requiredExact, requiredText, submitWith } from '#/lib/forms/fields'
import { PasskeySupport } from '#/lib/auth/passkey-support'
import AuthShell from './AuthShell'
import ProviderButtons from './ProviderButtons'
import { hasProviders } from './auth-providers'
import { useAuthActions, type AuthProvider } from './use-auth-actions'

const SignInSchema = type({
  email: requiredText('Enter your email address.'),
  password: requiredExact('Enter your password.'),
})

type SignInPageProps = {
  destination: string
  /** The `redirect` to carry over to sign-up, as given. */
  redirect?: string
  oauthError?: string
  providers: Record<AuthProvider, boolean>
  emailPassword: boolean
}

export default function SignInPage({ destination, redirect, oauthError, providers, emailPassword }: SignInPageProps) {
  const navigate = useNavigate()
  const auth = useAuthActions({ destination, returnPath: '/login', initialError: AuthErrorMessages.oauth(oauthError) })
  const form = useForm({
    defaultValues: { email: '', password: '' },
    validators: { onSubmit: SignInSchema },
    onSubmit: ({ value }) =>
      auth.run('email', async () => {
        try {
          const { error } = await AuthSession.client.signIn.email({ email: value.email.trim(), password: value.password })
          if (error) return AuthErrorMessages.emailSignIn(error)
          await auth.finish()
        } catch {
          return AuthErrorMessages.emailSignIn(undefined)
        }
      }),
  })

  // Saved passkeys show up in the email field's autofill when the browser supports it.
  useEffect(() => {
    let cancelled = false
    void PasskeySupport.canAutofill().then(async (canAutofill) => {
      if (!canAutofill || cancelled) return
      const { data, error } = await AuthSession.client.signIn.passkey({ autoFill: true })
      if (!cancelled && data && !error) await auth.finish()
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signInWithPasskey = () =>
    auth.run('passkey', async () => {
      if (!PasskeySupport.isAvailable()) return 'This browser does not support passkeys. Try another way to sign in.'
      try {
        const { data, error } = await AuthSession.client.signIn.passkey()
        if (error || !data) return AuthErrorMessages.passkey(error)
        await auth.finish()
      } catch (caught) {
        return AuthErrorMessages.passkey(
          caught instanceof Error ? { message: `${caught.name} ${caught.message}` } : undefined,
        )
      }
    })

  const signUp = { to: '/signup' as const, ...(redirect ? { redirect } : {}) }

  return (
    <AuthShell
      heading="Welcome back"
      subheading="Sign in to your OpenLink workspace."
      switchTo={{ prompt: 'New to OpenLink?', label: 'Sign up', ...signUp }}
    >
      <ProviderButtons
        providers={providers}
        pending={auth.pending}
        onSocial={(p) => void auth.social(p)}
        onPasskey={() => void signInWithPasskey()}
      />

      {emailPassword ? (
        <>
          <Divider
            label={
              <Text size="xsm" color="secondary">
                or with email
              </Text>
            }
          />
          {/* POST so credentials never end up in the URL if this is submitted before hydration. */}
          <form
            method="post"
            noValidate
            onSubmit={submitWith(form)}
          >
            <VStack gap={4} hAlign="stretch">
              <form.Field name="email">
                {(field) => (
                  <TextInput
                    label="Email address"
                    type="email"
                    placeholder="you@company.com"
                    value={field.state.value}
                    onChange={field.handleChange}
                    status={fieldStatus(field.state.meta.errors)}
                    // "webauthn" lets the browser offer saved passkeys right here.
                    autoComplete="username webauthn"
                    autoCapitalize="none"
                    hasSpellCheck={false}
                    htmlName="email"
                    width="100%"
                    isRequired
                  />
                )}
              </form.Field>
              <VStack gap={2} hAlign="stretch">
                <form.Field name="password">
                  {(field) => (
                    <PasswordField
                      label="Password"
                      placeholder="Enter your password"
                      value={field.state.value}
                      onChange={field.handleChange}
                      status={fieldStatus(field.state.meta.errors)}
                      autoComplete="current-password webauthn"
                      htmlName="password"
                      isRequired
                    />
                  )}
                </form.Field>
                <HStack hAlign="end">
                  <Link
                    href="#"
                    size="xsm"
                    color="secondary"
                    onClick={(event) => {
                      event.preventDefault()
                      auth.setNotice(
                        'Password recovery needs an email service, which is not set up yet. Ask a workspace admin for help.',
                      )
                    }}
                  >
                    Forgot password?
                  </Link>
                </HStack>
              </VStack>
              <Button
                label="Sign in"
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
          Sign-in is not configured yet. Add Google or GitHub credentials to the server.
        </Text>
      ) : null}

      <Divider />
      <VStack gap={2} hAlign="stretch">
        <Text size="sm" color="secondary" justify="center">
          Don’t have an account yet?
        </Text>
        <Button
          variant="secondary"
          label="Create an account"
          width="100%"
          href={signUp.redirect ? `/signup?redirect=${encodeURIComponent(signUp.redirect)}` : '/signup'}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            event.preventDefault()
            void navigate({ to: '/signup', search: signUp.redirect ? { redirect: signUp.redirect } : {} })
          }}
        />
      </VStack>
    </AuthShell>
  )
}
