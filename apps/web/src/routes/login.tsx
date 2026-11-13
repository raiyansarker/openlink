import { createFileRoute } from '@tanstack/react-router'
import LoginPage from '#/components/login/LoginPage'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/login')({
  head: createPageHead('Sign In'),
  component: LoginPage,
})
