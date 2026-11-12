import type { HTMLAttributes } from 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'elements-api': HTMLAttributes<HTMLElement> & {
        apiDescriptionUrl?: string
        router?: string
        layout?: string
      }
    }
  }
}

export {}
