import { type } from 'arktype'

/**
 * ArkType building blocks for form fields. Each field fails with one
 * user-facing sentence, so forms can show `issue.message` as it is.
 * TanStack Form accepts these schemas as validators (Standard Schema).
 */
export class FormFields {
  /** Text with at least one non-space character. */
  static required(message: string) {
    return type('string').narrow((value, ctx) => value.trim().length > 0 || ctx.reject({ message }))
  }

  /** A non-empty value that is kept exactly as typed, such as a password. */
  static requiredExact(message: string) {
    return type('string').narrow((value, ctx) => value.length > 0 || ctx.reject({ message }))
  }

  /** A required email address; surrounding spaces are ignored. */
  static email(input: { required: string; invalid: string }) {
    const isEmail = type('string.email')
    return type('string').narrow((value, ctx) => {
      const email = value.trim()
      if (!email) return ctx.reject({ message: input.required })
      return !(isEmail(email) instanceof type.errors) || ctx.reject({ message: input.invalid })
    })
  }

  /** The message of the first problem in a field's error list, if any. */
  static firstError(errors: ReadonlyArray<unknown>): string | undefined {
    for (const error of errors) {
      if (typeof error === 'string' && error) return error
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return error.message
      }
    }
    return undefined
  }

  /** The `status` prop shared by Astryx inputs, built from a field's errors. */
  static status(errors: ReadonlyArray<unknown>) {
    const message = FormFields.firstError(errors)
    return message ? ({ type: 'error', message } as const) : undefined
  }
}
