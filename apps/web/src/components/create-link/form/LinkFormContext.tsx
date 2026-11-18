import { createContext, useContext, useMemo } from 'react'
import { useStore, type ReactFormExtendedApi } from '@tanstack/react-form'
import type {
  CreateLinkDraft,
  DraftErrors,
  DraftField,
} from '#/lib/links/create-link'
import { useOrganization } from '#/contexts/OrganizationContext'

/* eslint-disable @typescript-eslint/no-explicit-any -- the validator generics don't matter to consumers */
export type LinkForm = ReactFormExtendedApi<
  CreateLinkDraft,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Memoized per `values` object, so N subscribed fields cost one validation per change. */
export type ValidateFn = (values: CreateLinkDraft, isSubmitting: boolean) => DraftErrors

export type LinkFormContextValue = {
  form: LinkForm
  validate: ValidateFn
  isEditing: boolean
  /** Editing a link that already has a password (its value is never sent to the browser). */
  hasSavedPassword: boolean
  /** True while a preview image is uploading; read when submitting. */
  uploadingRef: { current: boolean }
  set: <K extends keyof CreateLinkDraft>(key: K, value: CreateLinkDraft[K]) => void
  /** Applies a change computed from the draft as it is right now. */
  patch: (change: (prev: CreateLinkDraft) => Partial<CreateLinkDraft>) => void
}

export const LinkFormContext = createContext<LinkFormContextValue | null>(null)

export function useLinkForm(): LinkFormContextValue {
  const ctx = useContext(LinkFormContext)
  if (!ctx) throw new Error('useLinkForm must be used inside <CreateLinkForm>')
  return ctx
}

/** One draft field. The caller re-renders only when this field changes. */
export function useDraftValue<K extends keyof CreateLinkDraft>(key: K): CreateLinkDraft[K] {
  const { form } = useLinkForm()
  return useStore(form.store, (state) => state.values[key])
}

/**
 * A value derived from the draft. Return primitives (or existing references) so
 * the caller only re-renders when the result actually changes.
 */
export function useDraftSelect<T>(selector: (draft: CreateLinkDraft) => T): T {
  const { form } = useLinkForm()
  return useStore(form.store, (state) => selector(state.values))
}

/**
 * The error to show for a field. Field problems appear once you try to save;
 * until then only the back-half is checked as you type.
 */
export function useFieldError(field: DraftField | (string & {})): string | undefined {
  const { form, validate } = useLinkForm()
  return useStore(form.store, (state) => {
    const message = (validate(state.values, state.isSubmitting) as Record<string, string | undefined>)[field]
    if (!message) return undefined
    const isVisible =
      state.submissionAttempts > 0 || (field === 'slug' && !!state.values.slug)
    return isVisible ? message : undefined
  })
}

export function useFieldStatus(field: DraftField | (string & {})) {
  const message = useFieldError(field)
  return useMemo(
    () => (message ? { type: 'error' as const, message } : undefined),
    [message],
  )
}

/** The back-half's host and full short URL, following the chosen domain and slug. */
export function useShortHost(): string {
  const { shortHostFor } = useOrganization()
  const domainId = useDraftValue('domainId')
  return shortHostFor(domainId)
}

export function useShortUrl(): string {
  const { shortUrlFor } = useOrganization()
  const domainId = useDraftValue('domainId')
  const slug = useDraftValue('slug')
  return shortUrlFor(slug.trim() || '…', domainId)
}
