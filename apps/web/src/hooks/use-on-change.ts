import { useState } from 'react'

/**
 * Runs `onChange` during render when `value` differs from the previous render,
 * so state that depends on a prop (a dialog opening, a different workspace)
 * resets in the same pass instead of after a stale paint, as `useEffect` would.
 * `onChange` should only set state of the calling component.
 */
export function useOnChange<T>(value: T, onChange: (value: T, previous: T) => void): void {
  const [previous, setPrevious] = useState(value)
  if (!Object.is(previous, value)) {
    setPrevious(value)
    onChange(value, previous)
  }
}
