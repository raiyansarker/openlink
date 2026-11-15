import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import { useWorkspaceDirectory, WorkspaceDirectoryProvider } from '#/contexts/WorkspaceDirectoryContext'
import { ActiveWorkspace } from '#/lib/dashboard/org-slug'
import WorkspaceStatusScreen from './WorkspaceStatusScreen'

type Section = 'overview' | 'analytics' | 'links'

function Redirector({ section }: { section: Section }) {
  const { organizations, status, errorMessage, refetch } = useWorkspaceDirectory()
  const navigate = useNavigate()
  const target = status === 'ready' ? ActiveWorkspace.pick(organizations) : null

  useEffect(() => {
    if (status !== 'ready') return
    if (!target) {
      void navigate({ to: '/create/organization', replace: true })
      return
    }
    const params = { orgSlug: target.slug }
    if (section === 'analytics') void navigate({ to: '/dashboard/$orgSlug/analytics', params, replace: true })
    else if (section === 'links') void navigate({ to: '/dashboard/$orgSlug/links', params, replace: true })
    else void navigate({ to: '/dashboard/$orgSlug', params, replace: true })
  }, [status, target, section, navigate])

  if (status === 'error') {
    return <WorkspaceStatusScreen state="error" message={errorMessage ?? 'Try again.'} onRetry={refetch} />
  }
  return <WorkspaceStatusScreen state="loading" />
}

/** Sends the visitor to their workspace (or to create one) once the list has loaded. */
export default function WorkspaceRedirect({ section = 'overview' }: { section?: Section }) {
  return (
    <WorkspaceDirectoryProvider>
      <Redirector section={section} />
    </WorkspaceDirectoryProvider>
  )
}
