import { useState, type FormEvent, type SVGProps } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Divider } from '@astryxdesign/core/Divider'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Link } from '@astryxdesign/core/Link'
import { Section } from '@astryxdesign/core/Section'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { DASHBOARD_SURFACE_BG } from '#/components/dashboard/layout/dashboard-shell-colors'
import { currentHostLabel } from '#/lib/url/format-host'

const SHORTCUT_PATH = 'M8 12C8 73 100 61 164 61C227 61 246 14 212 14C171 14 179 100 247 100H365C389 100 405 108 405 127'

const LOGIN_STYLES = `
.openlink-login {
  box-sizing: border-box;
  min-height: 100dvh;
  padding: clamp(var(--spacing-4), 3dvh, var(--spacing-8)) clamp(var(--spacing-6), 6vw, 6rem);
  display: flex;
  justify-content: center;
}
.openlink-login-shell {
  width: 100%;
  max-width: 68rem;
  min-width: 0;
}
.openlink-login-wordmark {
  font-size: var(--font-size-xl);
  letter-spacing: -0.045em;
}
.openlink-login-layout {
  flex: 1;
  align-content: center;
  padding-block: clamp(var(--spacing-4), 3dvh, var(--spacing-8));
  column-gap: clamp(var(--spacing-10), 8vw, 7rem);
}
.openlink-login-intro {
  min-width: 0;
  padding-inline-end: 0;
}
.openlink-login-statement {
  font-size: clamp(3rem, 6.2vw, 5.5rem);
  font-weight: 500;
  line-height: 1.04;
  letter-spacing: -0.06em;
}
.openlink-login-accent {
  color: var(--openlink-brand);
}
.openlink-login-description {
  max-width: 34ch;
  font-size: var(--font-size-sm);
  line-height: 1.75;
}
.openlink-login-shortcut {
  padding-top: var(--spacing-5);
  max-width: 25rem;
}
.openlink-login-url {
  font-family: 'Geist Mono Variable', monospace;
  letter-spacing: -0.035em;
}
.openlink-login-source {
  opacity: 0.65;
}
.openlink-login-destination {
  padding-inline-end: var(--spacing-2);
}
.openlink-login-route {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
  color: var(--openlink-brand);
}
.openlink-login-form {
  width: 100%;
  max-width: 23rem;
  min-width: 0;
  margin-inline-start: auto;
}
.openlink-login-heading {
  font-size: var(--font-size-2xl);
  letter-spacing: -0.035em;
}
.openlink-login-password {
  position: relative;
}
.openlink-login-password-toggle {
  position: absolute;
  inset-inline-end: var(--spacing-1);
  bottom: var(--spacing-1);
  color: var(--color-text-secondary);
}
@keyframes openlink-draw-shortcut {
  from { stroke-dashoffset: 1; }
  to { stroke-dashoffset: 0; }
}
@keyframes openlink-follow-shortcut {
  from { offset-distance: 0%; }
  to { offset-distance: 100%; }
}
@media (prefers-reduced-motion: no-preference) {
  .openlink-login-route-line,
  .openlink-login-route-head {
    animation-duration: 1.2s;
    animation-timing-function: ease-out;
    animation-fill-mode: both;
  }
  .openlink-login-route-line {
    stroke-dasharray: 1;
    animation-name: openlink-draw-shortcut;
  }
  .openlink-login-route-head {
    transform: none;
    offset-path: path('${SHORTCUT_PATH}');
    offset-position: 0 0;
    offset-anchor: 0 0;
    offset-rotate: auto;
    animation-name: openlink-follow-shortcut;
  }
}
@media (max-width: 54rem) {
  .openlink-login-shell { max-width: 26rem; }
  .openlink-login-layout {
    grid-template-columns: minmax(0, 1fr);
    row-gap: var(--spacing-6);
    padding-block: var(--spacing-4);
  }
  .openlink-login-intro { display: none; }
  .openlink-login-form { max-width: none; margin-inline-start: 0; }
}
@media (min-width: 54.001rem) and (max-height: 42rem) {
  .openlink-login-statement { font-size: clamp(3rem, 5.2vw, 4.25rem); }
  .openlink-login-shortcut { padding-top: 0; }
  .openlink-login-route { max-height: 5.5rem; }
}

@media (max-width: 24rem) {
  .openlink-login { padding-inline: var(--spacing-4); }
}
`

function ProviderIcon({ provider }: { provider: 'google' | 'github' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {provider === 'google' ? (
        <path d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.89-1.74 2.98-4.3 2.98-7.35ZM12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.5c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.75-5.59-4.1H3.07v2.59A10 10 0 0 0 12 22ZM6.41 13.94a6 6 0 0 1 0-3.88V7.47H3.07a10 10 0 0 0 0 9.06l3.34-2.59ZM12 5.96c1.47 0 2.79.5 3.82 1.5l2.87-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.47l3.34 2.59A6 6 0 0 1 12 5.96Z" />
      ) : (
        <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.86c-2.78.6-3.37-1.18-3.37-1.18-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03A9.6 9.6 0 0 1 12 6.82c.85 0 1.7.11 2.5.34 1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
      )}
    </svg>
  )
}

function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('This is a UI preview. Sign-in is not connected yet.')
  }

  return (
    <main className="openlink-login" style={{ backgroundColor: DASHBOARD_SURFACE_BG }}>
      <style>{LOGIN_STYLES}</style>
      <VStack gap={0} className="openlink-login-shell">
        <header>
          <Text weight="semibold" className="openlink-login-wordmark">OpenLink</Text>
        </header>

        <Grid
          columns={2}
          gap={10}
          align="start"
          className="openlink-login-layout"
        >
          <aside className="openlink-login-intro" aria-label="About OpenLink">
            <VStack gap={6}>
              <Heading level={2} className="openlink-login-statement">
                Short links.<br />
                <em className="openlink-login-accent" style={{ fontStyle: 'normal' }}>Long reach.</em>
              </Heading>
              <Text color="secondary" className="openlink-login-description">
                Make your links unmistakably yours.<br />
                Know where every click takes you.
              </Text>
              <VStack gap={2} className="openlink-login-shortcut" aria-hidden="true">
                <Text size="xsm" color="secondary" className="openlink-login-url openlink-login-source" hasStrikethrough>
                  your-site.com/a/very/long/story?ref=…
                </Text>
                <svg viewBox="0 0 440 136" fill="none" className="openlink-login-route">
                  <path
                    d={SHORTCUT_PATH}
                    pathLength="1"
                    className="openlink-login-route-line"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <g className="openlink-login-route-head" transform="translate(405 127) rotate(90)">
                    <path d="M-7-7 0 0-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                  <circle cx="8" cy="12" r="3" fill="var(--color-background-body)" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <Text size="base" weight="medium" justify="end" className="openlink-login-url openlink-login-destination">
{`${currentHostLabel()}/your-next-thing`}
                </Text>
              </VStack>
            </VStack>
          </aside>

          <VStack gap={6} className="openlink-login-form">
            <VStack gap={6}>
              <VStack gap={2}>
                <Heading level={1} className="openlink-login-heading">Welcome back</Heading>
                <Text color="secondary" size="sm">Sign in to your OpenLink workspace.</Text>
              </VStack>

              <VStack gap={5}>
                <Grid columns={2} gap={3}>
                  <Button
                    label="Google"
                    size="md"
                    width="100%"
                    icon={<ProviderIcon provider="google" />}
                    onClick={() => setNotice('Google sign-in is not connected in this UI preview.')}
                  />
                  <Button
                    label="GitHub"
                    size="md"
                    width="100%"
                    icon={<ProviderIcon provider="github" />}
                    onClick={() => setNotice('GitHub sign-in is not connected in this UI preview.')}
                  />
                </Grid>
                <Divider label={<Text size="xsm" color="secondary">or sign in with email</Text>} />
              </VStack>

              <form onSubmit={handleSubmit}>
                <VStack gap={5}>
                  <TextInput
                    label="Email address"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={setEmail}
                    autoComplete="username"
                    autoCapitalize="none"
                    hasSpellCheck={false}
                    htmlName="email"
                    width="100%"
                    isRequired
                  />
                  <VStack gap={2}>
                    <VStack gap={0} className="openlink-login-password">
                      <TextInput
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={setPassword}
                        autoComplete="current-password"
                        htmlName="password"
                        width="100%"
                        controlStyle={{ paddingInlineEnd: 'var(--spacing-10)' }}
                        isRequired
                      />
                      <IconButton
                        label={showPassword ? 'Hide password' : 'Show password'}
                        tooltip={showPassword ? 'Hide password' : 'Show password'}
                        variant="ghost"
                        size="sm"
                        type="button"
                        icon={<Icon icon={showPassword ? 'eyeSlash' : EyeIcon} size="sm" />}
                        className="openlink-login-password-toggle"
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((visible) => !visible)}
                      />
                    </VStack>
                    <HStack hAlign="end">
                      <Link
                        href="#login-notice"
                        size="xsm"
                        color="secondary"
                        onClick={(event) => {
                          event.preventDefault()
                          setNotice('Password recovery is not connected in this UI preview.')
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
                    endContent={<Icon icon="chevronRight" size="sm" />}
                  />
                </VStack>
              </form>
            </VStack>

            <Text size="xsm" color="secondary" justify="center">
              Need access? Ask your workspace admin for an invitation.
            </Text>

            <Section id="login-notice" variant="transparent" padding={0} role="status" aria-live="polite">
              {notice && <Text size="sm" color="secondary">{notice}</Text>}
            </Section>
          </VStack>
        </Grid>
      </VStack>
    </main>
  )
}
