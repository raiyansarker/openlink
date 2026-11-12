import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <main style={{ padding: '1.5rem' }}>
      <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>About</h1>
    </main>
  )
}
