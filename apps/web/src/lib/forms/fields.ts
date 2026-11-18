import { type } from 'arktype'

/*
 * ArkType building blocks for form fields. Each field fails with one
 * user-facing sentence, so forms can show `issue.message` as it is.
 * TanStack Form accepts these schemas as validators (Standard Schema).
 */

/** Text with at least one non-space character. */
export function requiredText(message: string) {
  return type('string').narrow((value, ctx) => value.trim().length > 0 || ctx.reject({ message }))
}

/** A non-empty value that is kept exactly as typed, such as a password. */
export function requiredExact(message: string) {
  return type('string').narrow((value, ctx) => value.length > 0 || ctx.reject({ message }))
}

const isEmail = type('string.email')

/** A required email address; surrounding spaces are ignored. */
export function requiredEmail(input: { required: string; invalid: string }) {
  return type('string').narrow((value, ctx) => {
    const email = value.trim()
    if (!email) return ctx.reject({ message: input.required })
    return !(isEmail(email) instanceof type.errors) || ctx.reject({ message: input.invalid })
  })
}

/** A field that must match `check`, which returns an error message or null. */
export function checkedText(check: (value: string) => string | null) {
  return type('string').narrow((value, ctx) => {
    const message = check(value)
    return message === null || ctx.reject({ message })
  })
}

/** The message of the first problem in a field's error list, if any. */
export function firstError(errors: ReadonlyArray<unknown>): string | undefined {
  for (const error of errors) {
    if (typeof error === 'string' && error) return error
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      return error.message
    }
  }
  return undefined
}

/** The `status` prop shared by Astryx inputs, built from a field's errors. */
export function fieldStatus(errors: ReadonlyArray<unknown>) {
  const message = firstError(errors)
  return message ? ({ type: 'error', message } as const) : undefined
}

/** `onSubmit` for a `<form>` driven by TanStack Form: stops the browser's own submit and runs the form's. */
export function submitWith(form: { handleSubmit: () => Promise<unknown> }) {
  return (event: { preventDefault: () => void; stopPropagation: () => void }) => {
    event.preventDefault()
    event.stopPropagation()
    void form.handleSubmit()
  }
}
