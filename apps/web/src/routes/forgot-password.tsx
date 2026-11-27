import { createFileRoute } from '@tanstack/react-router'
import ForgotPasswordPage from '#/components/auth/ForgotPasswordPage'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/forgot-password')({
  head: createPageHead('Forgot Password'),
  component: ForgotPasswordPage,
})
