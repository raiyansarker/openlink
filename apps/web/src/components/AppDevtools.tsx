import { TanStackDevtools } from '@tanstack/react-devtools'
import { FormDevtoolsPanel } from '@tanstack/react-form-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

/**
 * TanStack devtools for Router, Query and Form, opened with `?debug` in the URL.
 * Rendered inside the app providers so the Query panel finds the app's QueryClient.
 */
export default function AppDevtools() {
  return (
    <TanStackDevtools
      config={{
        position: 'bottom-right',
        urlFlag: 'debug',
        requireUrlFlag: true,
      }}
      plugins={[
        { name: 'TanStack Router', render: <TanStackRouterDevtoolsPanel /> },
        { name: 'TanStack Query', render: <ReactQueryDevtoolsPanel /> },
        { name: 'TanStack Form', render: (_el, props) => <FormDevtoolsPanel {...props} /> },
      ]}
    />
  )
}
